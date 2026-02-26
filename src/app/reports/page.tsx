"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    format, startOfWeek, endOfWeek, addWeeks, subWeeks,
    eachDayOfInterval, isSameDay
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { getAllShiftsInRange, autoBreakDeduction, Shift, StaffMember } from "@/lib/staffService";

type StaffSummary = {
    staffId: string;
    staffName: string;
    totalPaidMinutes: number;
    shifts: Shift[];
};

function formatMins(minutes: number): string {
    if (minutes <= 0) return "—";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function getPaidMins(shift: Shift): number {
    if (shift.paidMinutes != null) return shift.paidMinutes;
    // Fallback for older shifts without paidMinutes
    const total = shift.totalMinutes ?? 0;
    return Math.max(0, total - autoBreakDeduction(total));
}

export default function ReportsPage() {
    const router = useRouter();
    const [staff, setStaff] = useState<StaffMember | null>(null);
    const [weekStart, setWeekStart] = useState(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
    );
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(false);

    // Guard: manager only
    useEffect(() => {
        const raw = sessionStorage.getItem("rtw_staff");
        if (!raw) { router.replace("/login"); return; }
        const parsed = JSON.parse(raw) as StaffMember;
        if (parsed.role !== "manager") { router.replace("/dashboard"); return; }
        setStaff(parsed);
    }, [router]);

    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 }); // Sunday
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const end = new Date(weekEnd);
            end.setHours(23, 59, 59, 999);
            const data = await getAllShiftsInRange(weekStart, end);
            setShifts(data);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekStart]);

    useEffect(() => {
        if (staff) fetchData();
    }, [staff, fetchData]);

    // Group by staff
    const staffMap = new Map<string, StaffSummary>();
    for (const shift of shifts) {
        if (!staffMap.has(shift.staffId)) {
            staffMap.set(shift.staffId, {
                staffId: shift.staffId,
                staffName: shift.staffName,
                totalPaidMinutes: 0,
                shifts: [],
            });
        }
        const entry = staffMap.get(shift.staffId)!;
        entry.shifts.push(shift);
        entry.totalPaidMinutes += getPaidMins(shift);
    }
    const staffList = Array.from(staffMap.values()).sort((a, b) =>
        a.staffName.localeCompare(b.staffName)
    );

    // CSV Export
    const exportCSV = () => {
        const rows: string[] = [
            "Staff Name,Date,Clock In,Clock Out,Total Hours,Break,Break Type,Paid Hours"
        ];
        for (const s of staffList) {
            for (const shift of s.shifts) {
                const date = format(shift.clockIn.toDate(), "dd/MM/yyyy");
                const ci = format(shift.clockIn.toDate(), "HH:mm");
                const co = shift.clockOut ? format(shift.clockOut.toDate(), "HH:mm") : "—";
                const total = formatMins(shift.totalMinutes ?? 0);
                const brk = formatMins(shift.breakMinutes ?? 0);
                const brkType = shift.breakSource === "auto" ? "Auto-deducted"
                    : shift.breakSource === "logged" ? "Logged by staff"
                        : "None";
                const paid = formatMins(getPaidMins(shift));
                rows.push(`"${s.staffName}","${date}","${ci}","${co}","${total}","${brk}","${brkType}","${paid}"`);
            }
        }
        const blob = new Blob([rows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `RTW-shifts-${format(weekStart, "dd-MM-yyyy")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!staff) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#d1d119]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 p-6">
            <div className="w-full max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            className="text-zinc-400 hover:text-white"
                            onClick={() => router.push("/dashboard")}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                        </Button>
                        <div>
                            <h1 className="text-2xl font-extrabold text-[#d1d119]">Staff Reports</h1>
                            <p className="text-zinc-500 text-sm">Roti Naan Wala · Manager View</p>
                        </div>
                    </div>
                    <Button
                        onClick={exportCSV}
                        disabled={shifts.length === 0}
                        className="bg-[#d1d119] hover:bg-[#b0b012] text-black font-bold"
                    >
                        <Download className="w-4 h-4 mr-2" /> Export CSV
                    </Button>
                </div>

                {/* Week Picker */}
                <Card className="bg-zinc-900 border-zinc-800 mb-6">
                    <CardContent className="p-4 flex items-center justify-between">
                        <Button
                            variant="ghost"
                            className="text-zinc-400 hover:text-white"
                            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <div className="text-center">
                            <div className="text-white font-bold text-lg">
                                {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
                            </div>
                            <div className="text-zinc-500 text-xs">
                                {shifts.length} shift{shifts.length !== 1 ? "s" : ""} recorded
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            className="text-zinc-400 hover:text-white"
                            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Loading */}
                {loading && (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-[#d1d119]" />
                    </div>
                )}

                {/* Staff Breakdown */}
                {!loading && staffList.length === 0 && (
                    <div className="text-center text-zinc-500 py-16">
                        No shifts recorded for this week.
                    </div>
                )}

                {!loading && staffList.map((s) => (
                    <Card key={s.staffId} className="bg-zinc-900 border-zinc-800 mb-4">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-white text-lg">{s.staffName}</CardTitle>
                                <div className="text-right">
                                    <div className="text-[#d1d119] font-bold text-xl">
                                        {formatMins(s.totalPaidMinutes)}
                                    </div>
                                    <div className="text-zinc-500 text-xs">paid this week</div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Day-by-day breakdown */}
                            <div className="grid grid-cols-7 gap-1 mb-3">
                                {weekDays.map((day) => {
                                    const dayShifts = s.shifts.filter((sh) =>
                                        isSameDay(sh.clockIn.toDate(), day)
                                    );
                                    const dayPaid = dayShifts.reduce((acc, sh) => acc + getPaidMins(sh), 0);
                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className={`p-2 rounded-lg text-center text-xs ${dayPaid > 0
                                                ? "bg-[#d1d119]/10 border border-[#d1d119]/20"
                                                : "bg-zinc-800/30 border border-zinc-800"
                                                }`}
                                        >
                                            <div className="text-zinc-400 font-medium">{format(day, "EEE")}</div>
                                            <div className={dayPaid > 0 ? "text-white font-bold" : "text-zinc-600"}>
                                                {dayPaid > 0 ? formatMins(dayPaid) : "—"}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Individual shifts */}
                            <div className="space-y-2 mt-3">
                                {s.shifts.map((shift) => (
                                    <div
                                        key={shift.id}
                                        className="flex items-center justify-between p-3 bg-zinc-800/40 rounded-lg text-sm"
                                    >
                                        <div>
                                            <span className="text-zinc-400 mr-3">{format(shift.clockIn.toDate(), "EEE d MMM")}</span>
                                            <span className="text-white">
                                                {format(shift.clockIn.toDate(), "HH:mm")}
                                                {shift.clockOut ? ` → ${format(shift.clockOut.toDate(), "HH:mm")}` : " → ongoing"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs">
                                            {(shift.breakMinutes ?? 0) > 0 && (
                                                <span className={`px-2 py-0.5 rounded-full ${shift.breakSource === "auto"
                                                    ? "bg-amber-900/40 text-amber-500"
                                                    : "bg-green-900/40 text-green-400"
                                                    }`}>
                                                    {shift.breakSource === "auto" ? "⚡" : "🟢"} {formatMins(shift.breakMinutes!)} break
                                                </span>
                                            )}
                                            <span className="text-white font-semibold">
                                                {formatMins(getPaidMins(shift))} paid
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
