"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedStaffData = exports.verifyStaffPin = exports.hashPin = exports.sendWeeklyReport = exports.sendDailyReport = exports.autoCloseShifts = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const date_fns_1 = require("date-fns");
const bcrypt = __importStar(require("bcryptjs"));
// Set region to London for performance and compliance
(0, v2_1.setGlobalOptions)({ region: "europe-west2" });
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
async function getSettings() {
    const snap = await db.collection("settings").limit(1).get();
    if (snap.empty)
        return null;
    return snap.docs[0].data();
}
/**
 * AUTO-CLOSE SHIFTS (Daily 23:59)
 */
exports.autoCloseShifts = (0, scheduler_1.onSchedule)("59 23 * * *", async (event) => {
    const settings = await getSettings();
    const closingTimeStr = settings?.closingTime || "23:00";
    const openShifts = await db.collection("shifts")
        .where("clockOut", "==", null)
        .get();
    const batch = db.batch();
    for (const doc of openShifts.docs) {
        const data = doc.data();
        const clockIn = data.clockIn.toDate();
        const [hours, mins] = closingTimeStr.split(":").map(Number);
        const clockOut = new Date(clockIn);
        clockOut.setHours(hours, mins, 0, 0);
        const totalMinutes = (0, date_fns_1.differenceInMinutes)(clockOut, clockIn);
        let breakMinutes = 0;
        const breakRules = settings?.breakRules || [
            { minHours: 4, deductionMins: 15 },
            { minHours: 6, deductionMins: 30 }
        ];
        const hoursWorked = totalMinutes / 60;
        for (const rule of breakRules) {
            if (hoursWorked >= rule.minHours)
                breakMinutes = Math.max(breakMinutes, rule.deductionMins);
        }
        batch.update(doc.ref, {
            clockOut: admin.firestore.Timestamp.fromDate(clockOut),
            totalMinutes,
            breakMinutes,
            paidMinutes: Math.max(0, totalMinutes - breakMinutes),
            isAutoClosed: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    await batch.commit();
    console.log(`Auto-closed ${openShifts.size} shifts.`);
});
/**
 * SEND DAILY REPORT (Daily 00:05)
 */
exports.sendDailyReport = (0, scheduler_1.onSchedule)("5 0 * * *", async (event) => {
    const settings = await getSettings();
    if (!settings?.enableEmailReports || !settings?.ownerEmail)
        return;
    const yesterday = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(new Date(), 1));
    const today = (0, date_fns_1.startOfDay)(new Date());
    const snap = await db.collection("shifts")
        .where("clockIn", ">=", admin.firestore.Timestamp.fromDate(yesterday))
        .where("clockIn", "<", admin.firestore.Timestamp.fromDate(today))
        .get();
    if (snap.empty)
        return;
    const summary = {};
    snap.docs.forEach(d => {
        const s = d.data();
        if (!summary[s.staffName])
            summary[s.staffName] = { total: 0, paid: 0 };
        summary[s.staffName].total += (s.totalMinutes || 0);
        summary[s.staffName].paid += (s.paidMinutes || 0);
    });
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: settings.ownerEmail,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    });
    const rows = Object.entries(summary).map(([name, stats]) => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${(stats.total / 60).toFixed(1)}h</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${(stats.paid / 60).toFixed(1)}h</td>
        </tr>
    `).join("");
    await transporter.sendMail({
        from: `"RTW Staff App" <${settings.ownerEmail}>`,
        to: settings.ownerEmail,
        subject: `Daily Staff Report - ${(0, date_fns_1.format)(yesterday, "MMM do")}`,
        html: `<h2>Daily Summary</h2><table style="width:100%">${rows}</table>`
    });
});
/**
 * SEND WEEKLY REPORT (Sunday 23:59)
 */
exports.sendWeeklyReport = (0, scheduler_1.onSchedule)("59 23 * * 0", async (event) => {
    const settings = await getSettings();
    if (!settings?.enableEmailReports || !settings?.ownerEmail)
        return;
    const endOfToday = new Date();
    const sevenDaysAgo = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(endOfToday, 7));
    const snap = await db.collection("shifts")
        .where("clockIn", ">=", admin.firestore.Timestamp.fromDate(sevenDaysAgo))
        .where("clockIn", "<=", admin.firestore.Timestamp.fromDate(endOfToday))
        .get();
    if (snap.empty)
        return;
    const summary = {};
    snap.docs.forEach(d => {
        const s = d.data();
        if (!summary[s.staffName])
            summary[s.staffName] = { total: 0, paid: 0 };
        summary[s.staffName].total += (s.totalMinutes || 0);
        summary[s.staffName].paid += (s.paidMinutes || 0);
    });
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: settings.ownerEmail,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    });
    const rows = Object.entries(summary).map(([name, stats]) => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${(stats.total / 60).toFixed(1)}h</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${(stats.paid / 60).toFixed(1)}h</td>
        </tr>
    `).join("");
    await transporter.sendMail({
        from: `"RTW Staff App" <${settings.ownerEmail}>`,
        to: settings.ownerEmail,
        subject: `Weekly Staff Summary - Week Ending ${(0, date_fns_1.format)(endOfToday, "MMM do")}`,
        html: `<h2>Weekly Summary</h2><table style="width:100%">${rows}</table>`
    });
});
/**
 * SECURE PIN HASHING
 */
exports.hashPin = (0, https_1.onCall)(async (request) => {
    const { pin } = request.data;
    if (!pin)
        throw new https_1.HttpsError("invalid-argument", "PIN required");
    const salt = await bcrypt.genSalt(10);
    return { hashed: await bcrypt.hash(pin, salt) };
});
/**
 * VERIFY PIN
 */
exports.verifyStaffPin = (0, https_1.onCall)(async (request) => {
    const { pin, hashedPin } = request.data;
    if (!pin || !hashedPin)
        throw new https_1.HttpsError("invalid-argument", "Missing data");
    return { success: await bcrypt.compare(pin, hashedPin) };
});
/**
 * SEED STAFF DATA
 */
exports.seedStaffData = (0, https_1.onRequest)(async (req, res) => {
    const staff = [
        { name: 'Alice Smith', role: 'manager', pin: '1111', staffCode: 'RTW101', isActive: true },
        { name: 'Bob Johnson', role: 'kitchen', pin: '2222', staffCode: 'RTW102', isActive: true },
        { name: 'Charlie Brown', role: 'counter', pin: '3333', staffCode: 'RTW103', isActive: true },
        { name: 'David Lee', role: 'driver', pin: '4444', staffCode: 'RTW104', isActive: true },
        { name: 'Emma Watson', role: 'kitchen', pin: '5555', staffCode: 'RTW105', isActive: true },
        { name: 'Fiona Gallagher', role: 'counter', pin: '6666', staffCode: 'RTW106', isActive: true },
        { name: 'George Clooney', role: 'driver', pin: '7777', staffCode: 'RTW107', isActive: true },
        { name: 'Hannah Montana', role: 'kitchen', pin: '8888', staffCode: 'RTW108', isActive: true }
    ];
    const staffCol = db.collection("staff");
    for (const s of staff) {
        await staffCol.doc(s.staffCode).set(s);
    }
    res.send({ success: true, message: "Staff database seeded successfully." });
});
//# sourceMappingURL=index.js.map