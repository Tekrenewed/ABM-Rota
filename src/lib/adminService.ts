import { collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";
import { Shift, StaffMember } from "./staffService";

// ─── Admin Auth ────────────────────────────────────────────────────────────────

// Currently using 110011 as default. In production, this should be moved to a 'internal_settings' collection or env.
let CACHED_ADMIN_PIN: string | null = null;

export async function getAdminPin(): Promise<string> {
    if (CACHED_ADMIN_PIN) return CACHED_ADMIN_PIN;
    const snap = await getDocs(collection(db, "settings"));
    if (!snap.empty && snap.docs[0].data().adminPin) {
        CACHED_ADMIN_PIN = snap.docs[0].data().adminPin;
        return CACHED_ADMIN_PIN!;
    }
    return process.env.NEXT_PUBLIC_ADMIN_PIN ?? "110011";
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
    const actual = await getAdminPin();
    return pin === actual;
}

export function isAdminAuthed(): boolean {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("rtw_admin") === "true";
}

export function setAdminAuthed() {
    sessionStorage.setItem("rtw_admin", "true");
}

export function clearAdminAuth() {
    sessionStorage.removeItem("rtw_admin");
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
    closingTime: string;          // "23:00"
    ownerEmail: string;
    emailReportsEnabled: boolean;
    breakRule4h: number;          // minutes to deduct for 4-6h shifts
    breakRule6h: number;          // minutes to deduct for 6h+ shifts
    shopName: string;
    shopAddress: string;
    currencySymbol: string;
    adminPin: string;
}

const DEFAULT_SETTINGS: AppSettings = {
    closingTime: "23:00",
    ownerEmail: "",
    emailReportsEnabled: false,
    breakRule4h: 15,
    breakRule6h: 30,
    shopName: "Roti Naan Wala",
    shopAddress: "",
    currencySymbol: "£",
    adminPin: "110011"
};

export async function getSettings(): Promise<AppSettings> {
    const snap = await getDocs(collection(db, "settings"));
    if (snap.empty) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...snap.docs[0].data() } as AppSettings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
    const snap = await getDocs(collection(db, "settings"));
    if (snap.empty) {
        await addDoc(collection(db, "settings"), settings);
    } else {
        await updateDoc(doc(db, "settings", snap.docs[0].id), { ...settings });
    }
}

// ─── Staff CRUD ────────────────────────────────────────────────────────────────

export async function getAllStaff(): Promise<StaffMember[]> {
    const snap = await getDocs(query(collection(db, "staff"), orderBy("name", "asc")));
    return snap.docs.map((d) => ({ id: d.id, isActive: true, ...d.data() } as StaffMember));
}

export async function createStaffMember(data: {
    name: string; role: string; pin: string; staffCode: string;
}): Promise<string> {
    const ref = await addDoc(collection(db, "staff"), { ...data, isActive: true });
    return ref.id;
}

export async function updateStaffMember(id: string, data: Partial<StaffMember>): Promise<void> {
    await updateDoc(doc(db, "staff", id), { ...data });
}

export async function deactivateStaff(id: string): Promise<void> {
    await updateDoc(doc(db, "staff", id), { isActive: false });
}

export async function reactivateStaff(id: string): Promise<void> {
    await updateDoc(doc(db, "staff", id), { isActive: true });
}

// ─── Live Overview ──────────────────────────────────────────────────────────────

export interface ActiveShift {
    shift: Shift;
    staff: StaffMember | null;
}

export async function getAllActiveShiftsToday(): Promise<Shift[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const snap = await getDocs(
        query(collection(db, "shifts"), where("clockOut", "==", null), limit(50))
    );

    return snap.docs
        .map((d) => {
            const raw = d.data();
            return {
                id: d.id,
                staffId: raw.staffId,
                staffName: raw.staffName,
                clockIn: raw.clockIn,
                clockOut: null,
                totalMinutes: null,
                breaks: raw.breaks || [],
                breakMinutes: null,
                paidMinutes: null,
                breakSource: null,
            } as Shift;
        })
        .filter((s) => s.clockIn && s.clockIn.toMillis() >= startOfDay.getTime());
}

export async function getTodayCompletedShifts(): Promise<Shift[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const snap = await getDocs(
        query(collection(db, "shifts"), limit(200))
    );

    return snap.docs
        .map((d) => {
            const raw = d.data();
            return {
                id: d.id, staffId: raw.staffId, staffName: raw.staffName,
                clockIn: raw.clockIn, clockOut: raw.clockOut,
                totalMinutes: raw.totalMinutes, breaks: raw.breaks || [],
                breakMinutes: raw.breakMinutes, paidMinutes: raw.paidMinutes,
                breakSource: raw.breakSource,
            } as Shift;
        })
        .filter((s) => s.clockOut && s.clockIn && s.clockIn.toMillis() >= startOfDay.getTime());
}
