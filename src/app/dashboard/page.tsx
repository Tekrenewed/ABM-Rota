"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, differenceInMinutes } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    LogOut, Clock, Calendar, CheckCircle2, Loader2,
    Coffee, PlayCircle, BarChart2
} from "lucide-react";
import {
    clockIn, clockOut, startBreak, endBreak, getTodayShifts,
    autoBreakDeduction, StaffMember, Shift, Break
} from "@/lib/staffService";
import { Timestamp } from "firebase/firestore";

export default function DashboardPage() {
    const [staff, setStaff] = useState<StaffMember | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
    const [activeClockInTime, setActiveClockInTime] = useState<Timestamp | null>(null);
    const [activeBreaks, setActiveBreaks] = useState<Break[]>([]);
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [activeBreakStart, setActiveBreakStart] = useState<Timestamp | null>(null);
    const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [clockError, setClockError] = useState<string | null>(null);
    const router = useRouter();

    // Load staff from session
    useEffect(() => {
        const raw = sessionStorage.getItem("rtw_staff");
        if (!raw) { router.replace("/login"); return; }
        setStaff(JSON.parse(raw) as StaffMember);
    }, [router]);

    // Live clock every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch today's shifts
    const fetchShifts = useCallback(async (staffId: string) => {
        const shifts = await getTodayShifts(staffId);
        setTodayShifts(shifts);
        const openShift = shifts.find((s) => s.clockOut === null);
        if (openShift) {
            setIsClockedIn(true);
            setActiveShiftId(openShift.id);
            setActiveClockInTime(openShift.clockIn);
            setActiveBreaks(openShift.breaks || []);
            const openBreak = openShift.breaks?.find((b) => b.end === null);
            if (openBreak) {
                setIsOnBreak(true);
                setActiveBreakStart(openBreak.start);
            } else {
                setIsOnBreak(false);
                setActiveBreakStart(null);
            }
        } else {
            setIsClockedIn(false);
            setActiveShiftId(null);
            setActiveClockInTime(null);
            setActiveBreaks([]);
            setIsOnBreak(false);
            setActiveBreakStart(null);
        }
    }, []);

    useEffect(() => {
        if (staff) fetchShifts(staff.id);
    }, [staff, fetchShifts]);

    const handleLogout = () => {
        sessionStorage.removeItem("rtw_staff");
        router.push("/login");
    };

    const handleToggleClock = async () => {
        if (!staff) return;
        setActionLoading(true);
        setClockError(null);
        try {
            if (isClockedIn && activeShiftId && activeClockInTime) {
                // CLOCK OUT — optimistic update first
                setIsClockedIn(false);
                setActiveShiftId(null);
                setActiveClockInTime(null);
                setActiveBreaks([]);
                setIsOnBreak(false);
                setActiveBreakStart(null);
                await clockOut(activeShiftId, activeClockInTime, activeBreaks);
            } else {
                // CLOCK IN
                const result = await clockIn(staff);
                setIsClockedIn(true);
                setActiveShiftId(result.id);
                setActiveClockInTime(result.clockIn);
                setActiveBreaks([]);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
            setClockError(msg);
        } finally {
            setActionLoading(false);
        }
        setTimeout(() => fetchShifts(staff.id), 800);
    };

    const handleToggleBreak = async () => {
        if (!activeShiftId || !staff) return;
        setActionLoading(true);
        setClockError(null);
        try {
            if (isOnBreak && activeBreakStart) {
                // END BREAK — optimistic
                const now = Timestamp.now();
                const updatedBreaks: Break[] = activeBreaks.map((b) =>
                    b.start.toMillis() === activeBreakStart.toMillis() ? { start: b.start, end: now } : b
                );
                setIsOnBreak(false);
                setActiveBreakStart(null);
                setActiveBreaks(updatedBreaks);
                await endBreak(activeShiftId, activeBreakStart);
            } else {
                // START BREAK — optimistic
                const now = Timestamp.now();
                const newBreak: Break = { start: now, end: null };
                setIsOnBreak(true);
                setActiveBreakStart(now);
                setActiveBreaks([...activeBreaks, newBreak]);
                await startBreak(activeShiftId);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Break error. Please try again.";
            setClockError(msg);
        } finally {
            setActionLoading(false);
        }
        setTimeout(() => fetchShifts(staff.id), 800);
    };

    const formatMins = (minutes: number) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    };

    const totalPaidMinutes = todayShifts.reduce((acc, s) => acc + (s.paidMinutes ?? 0), 0);

    // Preview how much break will be auto-deducted if clocked out now
    const elapsedMinutes = activeClockInTime
        ? differenceInMinutes(currentTime, activeClockInTime.toDate())
        : 0;
    const loggedBreakMins = activeBreaks.reduce((acc, b) => {
        if (b.end) return acc + Math.round((b.end.toMillis() - b.start.toMillis()) / 60000);
        return acc;
    }, 0);
    const autoDeductPreview = loggedBreakMins === 0 ? autoBreakDeduction(elapsedMinutes) : 0;

    if (!staff) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#d1d119]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-start p-6">
            <div className="w-full max-w-4xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#d1d119] tracking-tight">
                            Roti Naan Wala
                        </h1>
                        <p className="text-zinc-400 mt-1">
                            Welcome, <span className="text-white font-semibold">{staff.name}</span>
                            <span className="text-zinc-600 ml-2 text-sm">({staff.role})</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {staff.role === "manager" && (
                            <Button
                                variant="outline"
                                className="border-[#d1d119]/40 text-[#d1d119] hover:bg-[#d1d119]/10"
                                onClick={() => router.push("/reports")}
                            >
                                <BarChart2 className="w-4 h-4 mr-2" />
                                Reports
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Clock In/Out Card */}
                    <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                        <div className="p-8 text-center border-b border-zinc-800/50">
                            <div className="text-6xl font-black text-white tracking-widest tabular-nums">
                                {format(currentTime, "HH:mm")}
                                <span className="text-3xl text-zinc-600">:{format(currentTime, "ss")}</span>
                            </div>
                            <div className="text-zinc-400 mt-2 text-base font-medium flex items-center justify-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {format(currentTime, "EEEE, MMMM do yyyy")}
                            </div>
                        </div>

                        <CardContent className="p-8 flex flex-col items-center gap-4">
                            {/* Status area */}
                            <div className="flex flex-col items-center gap-2 w-full">
                                {clockError && (
                                    <div className="text-red-400 text-sm bg-red-900/30 border border-red-800 px-4 py-2 rounded-lg text-center">
                                        {clockError}
                                    </div>
                                )}
                                {isClockedIn && activeClockInTime ? (
                                    <div className={`flex items-center font-medium px-4 py-2 rounded-full text-sm ${isOnBreak
                                        ? "text-amber-400 bg-amber-400/10"
                                        : "text-emerald-400 bg-emerald-400/10"
                                        }`}>
                                        {isOnBreak ? (
                                            <><Coffee className="w-4 h-4 mr-2" /> On break since {activeBreakStart ? format(activeBreakStart.toDate(), "HH:mm") : "—"}</>
                                        ) : (
                                            <><CheckCircle2 className="w-4 h-4 mr-2" />
                                                Clocked in since {format(activeClockInTime.toDate(), "HH:mm")}
                                                {" · "}{formatMins(differenceInMinutes(currentTime, activeClockInTime.toDate()))} elapsed
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center text-zinc-500 font-medium text-sm">
                                        <Clock className="w-4 h-4 mr-2" />
                                        You are currently clocked out
                                    </div>
                                )}

                                {/* Auto-deduction preview */}
                                {isClockedIn && !isOnBreak && autoDeductPreview > 0 && (
                                    <div className="text-xs text-zinc-500 bg-zinc-800/60 px-3 py-1 rounded-full">
                                        ⚡ {autoDeductPreview}m break will be auto-deducted on clock-out
                                    </div>
                                )}
                                {isClockedIn && loggedBreakMins > 0 && (
                                    <div className="text-xs text-amber-500/80 bg-zinc-800/60 px-3 py-1 rounded-full">
                                        🟢 {formatMins(loggedBreakMins)} break logged — no auto-deduction
                                    </div>
                                )}
                            </div>

                            {/* CLOCK IN / OUT Button */}
                            <Button
                                onClick={handleToggleClock}
                                disabled={actionLoading || isOnBreak}
                                className={`w-full max-w-xs h-20 text-2xl font-bold rounded-2xl transition-all shadow-lg ${isClockedIn
                                    ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
                                    : "bg-[#d1d119] hover:bg-[#b0b012] text-black shadow-[#d1d119]/20"
                                    } disabled:opacity-60`}
                            >
                                {actionLoading ? (
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                ) : isClockedIn ? "CLOCK OUT" : "CLOCK IN"}
                            </Button>

                            {/* BREAK Button — only visible when clocked in */}
                            {isClockedIn && (
                                <Button
                                    onClick={handleToggleBreak}
                                    disabled={actionLoading}
                                    variant="outline"
                                    className={`w-full max-w-xs h-12 text-sm font-semibold rounded-xl transition-all ${isOnBreak
                                        ? "border-amber-500 text-amber-400 hover:bg-amber-500/10"
                                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                                        }`}
                                >
                                    {isOnBreak ? (
                                        <><PlayCircle className="w-4 h-4 mr-2" /> End Break</>
                                    ) : (
                                        <><Coffee className="w-4 h-4 mr-2" /> Start Break</>
                                    )}
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Today's Activity */}
                    <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-xl text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-[#d1d119]" />
                                Today&apos;s Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                {todayShifts.length === 0 ? (
                                    <p className="text-zinc-500 text-sm text-center py-8">
                                        No shifts recorded today yet.
                                    </p>
                                ) : (
                                    todayShifts.map((shift) => (
                                        <div
                                            key={shift.id}
                                            className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-800"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${shift.clockOut ? "bg-zinc-400" : "bg-emerald-500 animate-pulse"}`} />
                                                    <div className="text-white font-medium text-sm">
                                                        {format(shift.clockIn.toDate(), "HH:mm")}
                                                        {shift.clockOut ? ` → ${format(shift.clockOut.toDate(), "HH:mm")}` : " → now"}
                                                    </div>
                                                </div>
                                                <div className={`text-xs font-semibold px-2 py-1 rounded-full ${shift.clockOut ? "bg-zinc-700 text-zinc-300" : "bg-emerald-500/20 text-emerald-400"}`}>
                                                    {shift.clockOut ? "Completed" : "Active"}
                                                </div>
                                            </div>

                                            {/* Break and paid hours info */}
                                            {shift.clockOut && (
                                                <div className="ml-5 text-xs text-zinc-500 flex flex-wrap gap-2">
                                                    <span>Total: {formatMins(shift.totalMinutes ?? 0)}</span>
                                                    {(shift.breakMinutes ?? 0) > 0 && (
                                                        <span className={shift.breakSource === "auto"
                                                            ? "text-amber-600"
                                                            : "text-amber-400"
                                                        }>
                                                            − {formatMins(shift.breakMinutes!)} break
                                                            {shift.breakSource === "auto" ? " ⚡auto" : " 🟢logged"}
                                                        </span>
                                                    )}
                                                    <span className="text-white font-medium">
                                                        = {formatMins(shift.paidMinutes ?? 0)} paid
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {totalPaidMinutes > 0 && (
                                <div className="mt-6 pt-5 border-t border-zinc-800 flex justify-between items-center">
                                    <span className="text-zinc-400 text-sm">Total Paid Today</span>
                                    <span className="text-white font-bold text-xl tabular-nums">
                                        {formatMins(totalPaidMinutes)}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
