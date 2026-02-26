"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  autoCloseShifts: () => autoCloseShifts,
  hashPin: () => hashPin,
  seedStaffData: () => seedStaffData,
  sendDailyReport: () => sendDailyReport,
  sendWeeklyReport: () => sendWeeklyReport,
  verifyStaffPin: () => verifyStaffPin
});
module.exports = __toCommonJS(index_exports);
var import_scheduler = require("firebase-functions/v2/scheduler");
var import_https = require("firebase-functions/v2/https");
var import_v2 = require("firebase-functions/v2");
var admin = __toESM(require("firebase-admin"));

// node_modules/date-fns/constants.js
var daysInYear = 365.2425;
var maxTime = Math.pow(10, 8) * 24 * 60 * 60 * 1e3;
var minTime = -maxTime;
var millisecondsInMinute = 6e4;
var secondsInHour = 3600;
var secondsInDay = secondsInHour * 24;
var secondsInWeek = secondsInDay * 7;
var secondsInYear = secondsInDay * daysInYear;
var secondsInMonth = secondsInYear / 12;
var secondsInQuarter = secondsInMonth * 3;
var constructFromSymbol = /* @__PURE__ */ Symbol.for("constructDateFrom");

// node_modules/date-fns/constructFrom.js
function constructFrom(date, value) {
  if (typeof date === "function") return date(value);
  if (date && typeof date === "object" && constructFromSymbol in date)
    return date[constructFromSymbol](value);
  if (date instanceof Date) return new date.constructor(value);
  return new Date(value);
}

// node_modules/date-fns/toDate.js
function toDate(argument, context) {
  return constructFrom(context || argument, argument);
}

// node_modules/date-fns/_lib/getRoundingMethod.js
function getRoundingMethod(method) {
  return (number) => {
    const round = method ? Math[method] : Math.trunc;
    const result = round(number);
    return result === 0 ? 0 : result;
  };
}

// node_modules/date-fns/differenceInMilliseconds.js
function differenceInMilliseconds(laterDate, earlierDate) {
  return +toDate(laterDate) - +toDate(earlierDate);
}

// node_modules/date-fns/differenceInMinutes.js
function differenceInMinutes(dateLeft, dateRight, options) {
  const diff = differenceInMilliseconds(dateLeft, dateRight) / millisecondsInMinute;
  return getRoundingMethod(options?.roundingMethod)(diff);
}

// src/index.ts
(0, import_v2.setGlobalOptions)({ region: "europe-west2" });
if (!admin.apps.length) {
  admin.initializeApp();
}
var db = admin.firestore();
async function getSettings() {
  const snap = await db.collection("settings").limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data();
}
var autoCloseShifts = (0, import_scheduler.onSchedule)("59 23 * * *", async (event) => {
  const settings = await getSettings();
  const closingTimeStr = settings?.closingTime || "23:00";
  const openShifts = await db.collection("shifts").where("clockOut", "==", null).get();
  const batch = db.batch();
  for (const doc of openShifts.docs) {
    const data = doc.data();
    const clockIn = data.clockIn.toDate();
    const [hours, mins] = closingTimeStr.split(":").map(Number);
    const clockOut = new Date(clockIn);
    clockOut.setHours(hours, mins, 0, 0);
    const totalMinutes = differenceInMinutes(clockOut, clockIn);
    let breakMinutes = 0;
    const breakRules = settings?.breakRules || [
      { minHours: 4, deductionMins: 15 },
      { minHours: 6, deductionMins: 30 }
    ];
    const hoursWorked = totalMinutes / 60;
    for (const rule of breakRules) {
      if (hoursWorked >= rule.minHours) breakMinutes = Math.max(breakMinutes, rule.deductionMins);
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
var sendDailyReport = (0, import_scheduler.onSchedule)("5 0 * * *", async (event) => {
  console.log("Generating report...");
});
var sendWeeklyReport = (0, import_scheduler.onSchedule)("59 23 * * 0", async (event) => {
  console.log("Generating report...");
});
var hashPin = (0, import_https.onCall)(async (request) => {
  const { pin } = request.data;
  if (!pin) throw new import_https.HttpsError("invalid-argument", "PIN required");
  return { hashed: "dummy_" + pin };
});
var verifyStaffPin = (0, import_https.onCall)(async (request) => {
  const { pin, hashedPin } = request.data;
  if (!pin || !hashedPin) throw new import_https.HttpsError("invalid-argument", "Missing data");
  return { success: hashedPin === "dummy_" + pin };
});
var seedStaffData = (0, import_https.onRequest)(async (req, res) => {
  const staff = [
    { name: "Alice Smith", role: "manager", pin: "1111", staffCode: "RTW101", isActive: true },
    { name: "Bob Johnson", role: "kitchen", pin: "2222", staffCode: "RTW102", isActive: true },
    { name: "Charlie Brown", role: "counter", pin: "3333", staffCode: "RTW103", isActive: true },
    { name: "David Lee", role: "driver", pin: "4444", staffCode: "RTW104", isActive: true },
    { name: "Emma Watson", role: "kitchen", pin: "5555", staffCode: "RTW105", isActive: true },
    { name: "Fiona Gallagher", role: "counter", pin: "6666", staffCode: "RTW106", isActive: true },
    { name: "George Clooney", role: "driver", pin: "7777", staffCode: "RTW107", isActive: true },
    { name: "Hannah Montana", role: "kitchen", pin: "8888", staffCode: "RTW108", isActive: true }
  ];
  const staffCol = db.collection("staff");
  for (const s of staff) {
    await staffCol.doc(s.staffCode).set(s);
  }
  res.send({ success: true, message: "Staff seeded." });
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  autoCloseShifts,
  hashPin,
  seedStaffData,
  sendDailyReport,
  sendWeeklyReport,
  verifyStaffPin
});
