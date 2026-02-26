import { collection, getDocs, addDoc, doc, setDoc, query, where, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { format, startOfWeek } from "date-fns";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RotaEntry {
    staffId: string;
    staffName: string;
    role: string;
    day: number;       // 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun
    startTime: string; // "09:00"
    endTime: string;   // "17:00"
}

export interface WeekRota {
    id: string;
    weekStarting: string; // ISO date string "2026-02-24"
    entries: RotaEntry[];
    updatedAt: Timestamp;
}

// ─── Week ID ──────────────────────────────────────────────────────────────────

export function getWeekId(weekStart: Date): string {
    return format(startOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

// ─── Rota CRUD ────────────────────────────────────────────────────────────────

export async function getWeekRota(weekStart: Date): Promise<WeekRota | null> {
    const weekId = getWeekId(weekStart);
    const snap = await getDocs(
        query(collection(db, "rota"), where("weekStarting", "==", weekId))
    );
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as WeekRota;
}

export async function saveWeekRota(weekStart: Date, entries: RotaEntry[]): Promise<void> {
    const weekId = getWeekId(weekStart);
    const snap = await getDocs(
        query(collection(db, "rota"), where("weekStarting", "==", weekId))
    );

    const data = {
        weekStarting: weekId,
        entries,
        updatedAt: Timestamp.now(),
    };

    if (snap.empty) {
        await addDoc(collection(db, "rota"), data);
    } else {
        await setDoc(doc(db, "rota", snap.docs[0].id), data);
    }
}

export async function getStaffWeekRota(staffId: string, weekStart: Date): Promise<RotaEntry[]> {
    const rota = await getWeekRota(weekStart);
    if (!rota) return [];
    return rota.entries.filter((e) => e.staffId === staffId);
}

// ─── Day helpers ──────────────────────────────────────────────────────────────

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const ROLES = ["manager", "kitchen", "counter", "driver"];
