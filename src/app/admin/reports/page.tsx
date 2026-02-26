"use client";

import {
    format, startOfWeek, endOfWeek, addWeeks, subWeeks,
    eachDayOfInterval, isSameDay, startOfDay as fnsStartOfDay
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft, ChevronRight, Download, Loader2,
    Calendar, Users, Clock, Filter, ListFilter,
    ArrowUpRight, BarChart3
} from "lucide-react";
import { getAllShiftsInRange, autoBreakDeduction, Shift } from "@/lib/staffService";
import { isAdminAuthed, getAllStaff } from "@/lib/adminService";
import { StaffMember } from "@/lib/staffService";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

type StaffSummary = {
    staffId: string;
    staffName: string;
    role: string;
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
    const total = shift.totalMinutes ?? 0;
    return Math.max(0, total - autoBreakDeduction(total));
}

export default function AdminReportsPage() {
    const router = useRouter();
    const [isAuthed, setIsAuthed] = useState(false);
    const [viewMode, setViewMode] = useState<"weekly" | "daily">("weekly");
    const [weekStart, setWeekStart] = useState(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
    );
    const [selectedDate, setSelectedDate] = useState(() => fnsStartOfDay(new Date()));
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [roleFilter, setRoleFilter] = useState("all");

    useEffect(() => {
        if (!isAdminAuthed()) {
            router.replace("/admin");
        } else {
            setIsAuthed(true);
        }
    }, [router]);

    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 }); // Sunday
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const rangeStart = viewMode === "weekly" ? weekStart : selectedDate;
            const rangeEnd = viewMode === "weekly" ? new Date(weekEnd) : new Date(selectedDate);
            rangeEnd.setHours(23, 59, 59, 999);

            const [shiftsData, staffData] = await Promise.all([
                getAllShiftsInRange(rangeStart, rangeEnd),
                getAllStaff()
            ]);

            setShifts(shiftsData);
            setStaffList(staffData);
        } finally {
            setLoading(false);
        }
    }, [viewMode, weekStart, weekEnd, selectedDate]);

    useEffect(() => {
        if (isAuthed) fetchData();
    }, [isAuthed, fetchData]);

    // Group by staff with filtering
    const staffMap = new Map<string, StaffSummary>();
    let totalMins = 0;

    for (const shift of shifts) {
        const staffDoc = staffList.find((s: StaffMember) => s.id === shift.staffId);
        const role = staffDoc?.role || "Staff";

        if (roleFilter !== "all" && role !== roleFilter) continue;

        if (!staffMap.has(shift.staffId)) {
            staffMap.set(shift.staffId, {
                staffId: shift.staffId,
                staffName: shift.staffName,
                role: role,
                totalPaidMinutes: 0,
                shifts: [],
            });
        }
        const entry = staffMap.get(shift.staffId)!;
        entry.shifts.push(shift);
        const paid = getPaidMins(shift);
        entry.totalPaidMinutes += paid;
        totalMins += paid;
    }

    const filteredStaffList = Array.from(staffMap.values()).sort((a, b) =>
        a.staffName.localeCompare(b.staffName)
    );

    const roles = Array.from(new Set(staffList.map((s: StaffMember) => s.role))).filter(Boolean) as string[];

    const exportCSV = () => {
        const rows: string[] = [
            "Staff Name,Role,Date,Clock In,Clock Out,Total Hours,Break,Break Type,Paid Hours"
        ];
        for (const s of filteredStaffList) {
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
                rows.push(`"${s.staffName}","${s.role}","${date}","${ci}","${co}","${total}","${brk}","${brkType}","${paid}"`);
            }
        }
        const blob = new Blob([rows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const fileName = viewMode === "weekly"
            ? `RTW-Weekly-${format(weekStart, "dd-MM-yyyy")}.csv`
            : `RTW-Daily-${format(selectedDate, "dd-MM-yyyy")}.csv`;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isAuthed) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#d1d119]" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Staff Reports</h1>
                    <p className="text-zinc-500 mt-1">Detailed breakdown of hours and breaks</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                        onClick={exportCSV}
                        disabled={shifts.length === 0}
                        variant="outline"
                        className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white h-11 px-4 rounded-xl flex-1 sm:flex-none"
                    >
                        <Download className="w-5 h-5 mr-2" /> Export
                    </Button>
                    <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 flex-1 sm:flex-none">
                        <button
                            onClick={() => setViewMode("weekly")}
                            className={`px-4 h-9 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === "weekly" ? "bg-[#d1d119] text-black shadow-lg shadow-[#d1d119]/10" : "text-zinc-500 hover:text-zinc-300"}`}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => setViewMode("daily")}
                            className={`px-4 h-9 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === "daily" ? "bg-[#d1d119] text-black shadow-lg shadow-[#d1d119]/10" : "text-zinc-500 hover:text-zinc-300"}`}
                        >
                            Daily
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="w-12 h-12 text-white" />
                    </div>
                    <CardContent className="p-6">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Labor Hours</p>
                        <h3 className="text-white text-3xl font-black">{formatMins(totalMins)}</h3>
                        <div className="flex items-center gap-1.5 mt-2 text-emerald-500 text-xs font-bold">
                            <ArrowUpRight className="w-4 h-4" />
                            <span>In selected range</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="w-12 h-12 text-white" />
                    </div>
                    <CardContent className="p-6">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Active Staff</p>
                        <h3 className="text-white text-3xl font-black">{staffMap.size}</h3>
                        <div className="flex items-center gap-1.5 mt-2 text-zinc-500 text-xs font-bold">
                            <span>Clocked in this {viewMode === "weekly" ? "week" : "day"}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BarChart3 className="w-12 h-12 text-white" />
                    </div>
                    <CardContent className="p-6">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Shifts</p>
                        <h3 className="text-white text-3xl font-black">{shifts.length}</h3>
                        <div className="flex items-center gap-1.5 mt-2 text-zinc-500 text-xs font-bold">
                            <span>Entries recorded</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Time Picker */}
                <Card className="bg-zinc-900 border-zinc-800 flex-1">
                    <CardContent className="p-2 flex items-center justify-between">
                        <Button
                            variant="ghost" className="text-zinc-400 hover:text-white"
                            onClick={() => {
                                if (viewMode === "weekly") setWeekStart(subWeeks(weekStart, 1));
                                else setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)));
                            }}
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <div className="text-center">
                            <div className="text-white font-black text-lg tracking-tight">
                                {viewMode === "weekly"
                                    ? `${format(weekStart, "dd MMM")} – ${format(weekEnd, "dd MMM yyyy")}`
                                    : format(selectedDate, "EEEE, dd MMM yyyy")
                                }
                            </div>
                        </div>
                        <Button
                            variant="ghost" className="text-zinc-400 hover:text-white"
                            onClick={() => {
                                if (viewMode === "weekly") setWeekStart(addWeeks(weekStart, 1));
                                else setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)));
                            }}
                        >
                            <ChevronRight className="w-6 h-6" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Role Filter */}
                <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 h-14">
                    <Filter className="w-4 h-4 text-zinc-600" />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-transparent text-white font-bold text-sm focus:outline-none min-w-[120px] cursor-pointer"
                        title="Filter by Staff Role"
                    >
                        <option value="all" className="bg-zinc-900">All Roles</option>
                        {roles.map(r => (
                            <option key={r} value={r} className="bg-zinc-900">{r}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Loading / Empty States */}
            {loading && shifts.length === 0 && (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-[#d1d119]" />
                </div>
            )}

            {!loading && filteredStaffList.length === 0 && (
                <div className="text-center text-zinc-600 py-20 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-3xl">
                    <ListFilter className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-bold text-lg text-zinc-400">No shifts match your selection.</p>
                    <p className="text-sm mt-1">Try changing the date or clearing filters.</p>
                </div>
            )}

            {/* Staff Breakdown */}
            {!loading && filteredStaffList.map((s) => (
                <Card key={s.staffId} className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <CardHeader className="pb-4 border-b border-zinc-800/50 bg-zinc-950/20">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-[#d1d119]">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-white text-xl font-black tracking-tight">{s.staffName}</CardTitle>
                                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] font-black rounded-md uppercase tracking-widest">{s.role}</span>
                                    </div>
                                    <p className="text-zinc-500 text-xs font-bold mt-0.5">{s.shifts.length} shifts recorded</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[#d1d119] font-black text-3xl">
                                    {formatMins(s.totalPaidMinutes)}
                                </div>
                                <div className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Paid Hours</div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {/* Weekly Day-by-day View */}
                        {viewMode === "weekly" && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 mb-6">
                                {weekDays.map((day) => {
                                    const dayShifts = s.shifts.filter((sh) =>
                                        isSameDay(sh.clockIn.toDate(), day)
                                    );
                                    const dayPaid = dayShifts.reduce((acc, sh) => acc + getPaidMins(sh), 0);
                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className={`p-3 rounded-2xl text-center transition-all ${dayPaid > 0
                                                ? "bg-[#d1d119]/5 border border-[#d1d119]/20 shadow-[0_0_15px_#d1d1190a]"
                                                : "bg-zinc-950/30 border border-zinc-800/50 opacity-40"
                                                }`}
                                        >
                                            <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{format(day, "EEE")}</div>
                                            <div className={dayPaid > 0 ? "text-white font-bold" : "text-zinc-700 font-medium"}>
                                                {dayPaid > 0 ? formatMins(dayPaid) : "—"}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Individual shifts log */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">
                                {viewMode === "weekly" ? "Weekly Shift History" : "Daily Shift Details"}
                            </h4>
                            {s.shifts.map((shift) => (
                                <div
                                    key={shift.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-950 border border-zinc-800/50 rounded-2xl gap-4 hover:border-zinc-700 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-500">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                                                {format(shift.clockIn.toDate(), "EEEE d MMM")}
                                            </p>
                                            <p className="text-white font-bold text-lg mt-0.5">
                                                {format(shift.clockIn.toDate(), "HH:mm")}
                                                <span className="mx-2 text-zinc-700">→</span>
                                                {shift.clockOut ? format(shift.clockOut.toDate(), "HH:mm") : <span className="text-[#d1d119] italic">Active</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {(shift.breakMinutes ?? 0) > 0 && (
                                            <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 ${shift.breakSource === "auto"
                                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                                : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                }`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                                {shift.breakSource === "auto" ? "Auto" : "Staff"} • {formatMins(shift.breakMinutes!)}
                                            </div>
                                        )}
                                        <div className="px-5 py-2 bg-zinc-900 text-white font-black rounded-xl text-xs border border-zinc-800 shadow-inner">
                                            {formatMins(getPaidMins(shift))} Paid
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
