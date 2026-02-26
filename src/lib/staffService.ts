import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    arrayUnion,
    Timestamp,
    limit,
    orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaffMember {
    id: string;
    name: string;
    role: string;
    pin: string;
    staffCode?: string;   // e.g. RTW01
    isActive?: boolean;
}

export interface Break {
    start: Timestamp;
    end: Timestamp | null;
}

export interface Shift {
    id: string;
    staffId: string;
    staffName: string;
    clockIn: Timestamp;
    clockOut: Timestamp | null;
    totalMinutes: number | null;   // raw shift length
    breaks: Break[];               // manually logged breaks
    breakMinutes: number | null;   // null = auto-deduction was used
    paidMinutes: number | null;    // what counts for payroll
    breakSource: "logged" | "auto" | "none" | null;
}

// ─── Auto-deduction rule ──────────────────────────────────────────────────────

export function autoBreakDeduction(totalMinutes: number): number {
    if (totalMinutes >= 360) return 30; // 6h+  → 30 min
    if (totalMinutes >= 240) return 15; // 4h+  → 15 min
    return 0;
}

// ─── Staff Auth ────────────────────────────────────────────────────────────────

export async function verifyStaffPin(pin: string): Promise<StaffMember | null> {
    const staffRef = collection(db, "staff");

    const qString = query(staffRef, where("pin", "==", pin));
    const snapshotString = await getDocs(qString);
    if (!snapshotString.empty) {
        const d = snapshotString.docs[0];
        return { id: d.id, ...d.data() } as StaffMember;
    }

    const pinAsNumber = parseInt(pin, 10);
    const qNumber = query(staffRef, where("pin", "==", pinAsNumber));
    const snapshotNumber = await getDocs(qNumber);
    if (!snapshotNumber.empty) {
        const d = snapshotNumber.docs[0];
        return { id: d.id, ...d.data() } as StaffMember;
    }

    return null;
}

// ─── Clock In / Out ───────────────────────────────────────────────────────────

export async function clockIn(staff: StaffMember): Promise<{ id: string; clockIn: Timestamp }> {
    const shiftsRef = collection(db, "shifts");

    // Guard: prevent duplicate clock-ins
    const openCheck = query(
        shiftsRef,
        where("staffId", "==", staff.id),
        where("clockOut", "==", null),
        limit(1)
    );
    const existing = await getDocs(openCheck);
    if (!existing.empty) {
        throw new Error("Already clocked in. Please clock out first.");
    }

    const now = Timestamp.now();
    const docRef = await addDoc(shiftsRef, {
        staffId: staff.id,
        staffName: staff.name,
        clockIn: now,
        clockOut: null,
        totalMinutes: null,
        breaks: [],
        breakMinutes: null,
        paidMinutes: null,
        breakSource: null,
    });
    return { id: docRef.id, clockIn: now };
}

export async function clockOut(shiftId: string, clockInTime: Timestamp, breaks: Break[]): Promise<void> {
    const clockOutTime = Timestamp.now();
    const totalMinutes = Math.round(
        (clockOutTime.toMillis() - clockInTime.toMillis()) / 60000
    );

    // Calculate break minutes from logged breaks
    const loggedBreakMinutes = breaks.reduce((acc, b) => {
        if (b.end) {
            return acc + Math.round((b.end.toMillis() - b.start.toMillis()) / 60000);
        }
        return acc;
    }, 0);

    let breakMinutes: number;
    let breakSource: "logged" | "auto" | "none";

    if (loggedBreakMinutes > 0) {
        // Staff actually logged their break
        breakMinutes = loggedBreakMinutes;
        breakSource = "logged";
    } else {
        // No break logged — apply auto-deduction
        breakMinutes = autoBreakDeduction(totalMinutes);
        breakSource = breakMinutes > 0 ? "auto" : "none";
    }

    const paidMinutes = Math.max(0, totalMinutes - breakMinutes);

    const shiftRef = doc(db, "shifts", shiftId);
    await updateDoc(shiftRef, {
        clockOut: clockOutTime,
        totalMinutes,
        breakMinutes,
        paidMinutes,
        breakSource,
    });
}

// ─── Break Tracking ───────────────────────────────────────────────────────────

export async function startBreak(shiftId: string): Promise<Timestamp> {
    const now = Timestamp.now();
    const shiftRef = doc(db, "shifts", shiftId);
    await updateDoc(shiftRef, {
        breaks: arrayUnion({ start: now, end: null }),
    });
    return now;
}

export async function endBreak(shiftId: string, breakStart: Timestamp): Promise<Timestamp> {
    const now = Timestamp.now();
    // Fetch the full breaks array, update the matching entry
    const shiftRef = doc(db, "shifts", shiftId);
    const snapshot = await getDocs(query(collection(db, "shifts"), where("__name__", "==", shiftId)));
    if (snapshot.empty) throw new Error("Shift not found");

    const data = snapshot.docs[0].data();
    const breaks: Break[] = data.breaks || [];
    const updated = breaks.map((b: Break) =>
        b.start.toMillis() === breakStart.toMillis() ? { start: b.start, end: now } : b
    );

    await updateDoc(shiftRef, { breaks: updated });
    return now;
}

// ─── Shift History ────────────────────────────────────────────────────────────

function mapShift(d: { id: string; data: () => Record<string, unknown> }): Shift {
    const raw = d.data();
    return {
        id: d.id,
        staffId: raw.staffId as string,
        staffName: raw.staffName as string,
        clockIn: raw.clockIn as Timestamp,
        clockOut: raw.clockOut as Timestamp | null,
        totalMinutes: raw.totalMinutes as number | null,
        breaks: (raw.breaks as Break[]) || [],
        breakMinutes: raw.breakMinutes as number | null,
        paidMinutes: raw.paidMinutes as number | null,
        breakSource: (raw.breakSource as Shift["breakSource"]) || null,
    };
}

export async function getTodayShifts(staffId: string): Promise<Shift[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const shiftsRef = collection(db, "shifts");
    const q = query(shiftsRef, where("staffId", "==", staffId), limit(50));
    const snapshot = await getDocs(q);
    const allShifts = snapshot.docs.map(mapShift);

    return allShifts
        .filter((s) => s.clockIn && s.clockIn.toMillis() >= startOfDay.getTime())
        .sort((a, b) => a.clockIn.toMillis() - b.clockIn.toMillis());
}

export async function getAllShiftsInRange(startDate: Date, endDate: Date): Promise<Shift[]> {
    const shiftsRef = collection(db, "shifts");
    // Fetch all and filter client-side (no composite index needed)
    const q = query(shiftsRef, orderBy("clockIn", "desc"), limit(500));
    const snapshot = await getDocs(q);

    const start = startDate.getTime();
    const end = endDate.getTime();

    return snapshot.docs
        .map(mapShift)
        .filter((s) => s.clockIn && s.clockIn.toMillis() >= start && s.clockIn.toMillis() <= end)
        .sort((a, b) => a.clockIn.toMillis() - b.clockIn.toMillis());
}
