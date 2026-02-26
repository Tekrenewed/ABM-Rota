"use client";

import { useState, useEffect, useCallback } from "react";
import { format, differenceInMinutes, startOfWeek, addDays } from "date-fns";
import {
    verifyStaffPin, clockIn, clockOut, startBreak, endBreak,
    getTodayShifts, StaffMember, Shift, Break
} from "@/lib/staffService";
import { getStaffWeekRota, RotaEntry, DAY_NAMES } from "@/lib/rotaService";
import { Button } from "@/components/ui/button";
import {
    Clock, Loader2, Coffee, PlayCircle,
    CheckCircle2, X, Calendar, User,
    ChevronLeft, ChevronRight, Lock, Unlock
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { BRAND_CONFIG } from "@/lib/brandingConfig";

export default function KioskPage() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [pin, setPin] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isAppLocked, setIsAppLocked] = useState(true);

    // Context states
    const [activeStaff, setActiveStaff] = useState<StaffMember | null>(null);
    const [activeShift, setActiveShift] = useState<Shift | null>(null);
    const [staffRota, setStaffRota] = useState<RotaEntry[]>([]);
    const [view, setView] = useState<"pin" | "action" | "rota">("pin");

    // Live clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Auto-timeout back to PIN screen
    useEffect(() => {
        if (view !== "pin" && !loading) {
            const timer = setTimeout(() => {
                resetKiosk();
            }, 15000); // 15 seconds for faster turnover
            return () => clearTimeout(timer);
        }
    }, [view, loading]);

    const resetKiosk = () => {
        setView("pin");
        setPin("");
        setActiveStaff(null);
        setActiveShift(null);
        setStaffRota([]);
        setError(null);
    };

    const handlePinPress = (n: string) => {
        if (pin.length < 4) {
            setPin(pin + n);
            setError(null);
        }
    };

    const handlePinDelete = () => {
        setPin(pin.slice(0, -1));
        setError(null);
    };

    useEffect(() => {
        if (pin.length === 4) {
            handleLogin();
        }
    }, [pin]);

    const handleLogin = async () => {
        setLoading(true);
        try {
            const staff = await verifyStaffPin(pin);
            if (!staff) {
                setError("Invalid PIN");
                setPin("");
                return;
            }
            if (!staff.isActive) {
                setError("Staff account inactive");
                setPin("");
                return;
            }

            setActiveStaff(staff);

            // Fetch shift state
            const shifts = await getTodayShifts(staff.id);
            const openShift = shifts.find(s => s.clockOut === null);
            setActiveShift(openShift || null);

            // Fetch rota
            const weekRota = await getStaffWeekRota(staff.id, new Date());
            setStaffRota(weekRota);

            setView("action");
        } catch (e) {
            setError("Login failed");
            setPin("");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleClock = async () => {
        if (!activeStaff) return;
        setLoading(true);
        try {
            if (activeShift) {
                // Determine if on break
                const activeBreak = activeShift.breaks?.find(b => b.end === null);
                if (activeBreak) {
                    await endBreak(activeShift.id, activeBreak.start);
                }
                await clockOut(activeShift.id, activeShift.clockIn, activeShift.breaks || []);
                resetKiosk();
            } else {
                const result = await clockIn(activeStaff);
                // Refresh local state or just close
                resetKiosk();
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error updating shift");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleBreak = async () => {
        if (!activeShift) return;
        setLoading(true);
        try {
            const activeBreak = activeShift.breaks?.find(b => b.end === null);
            if (activeBreak) {
                await endBreak(activeShift.id, activeBreak.start);
            } else {
                await startBreak(activeShift.id);
            }
            // Close session after action
            resetKiosk();
        } catch (e) {
            setError("Break error");
        } finally {
            setLoading(false);
        }
    };

    const formatMins = (minutes: number) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-primary opacity-50 shadow-[0_0_20px_var(--brand-primary)]" />
            <div className="absolute bottom-0 left-0 w-full h-1 bg-primary opacity-50 shadow-[0_0_20px_var(--brand-primary)]" />

            {/* Top Bar */}
            <div className="absolute top-8 left-8 right-8 flex justify-between items-start">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black text-primary tracking-tighter uppercase italic leading-none">{BRAND_CONFIG.clientName}</h1>
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mt-1">{BRAND_CONFIG.appTitle}</p>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-black tabular-nums tracking-wider leading-none">
                        {format(currentTime, "HH:mm")}
                        <span className="text-xl text-zinc-700 ml-1">:{format(currentTime, "ss")}</span>
                    </div>
                    <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">
                        {format(currentTime, "EEEE, dd MMM yyyy")}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="w-full max-w-5xl flex flex-col items-center">
                {view === "pin" && (
                    <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
                        <div className="mb-12 text-center">
                            <h2 className="text-5xl font-black mb-3 tracking-tight">Welcome</h2>
                            <p className="text-zinc-500 text-lg">Enter your PIN to manage your shift</p>
                        </div>

                        {/* PIN Slots */}
                        <div className="flex gap-4 mb-16">
                            {[0, 1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={`w-20 h-28 rounded-2xl border-4 flex items-center justify-center text-4xl font-black transition-all ${error
                                        ? "border-red-500 bg-red-500/10 text-red-500"
                                        : pin.length > i
                                            ? "border-primary bg-primary/10 text-white"
                                            : "border-zinc-800 bg-zinc-900/50 text-zinc-700"
                                        }`}
                                >
                                    {pin.length > i ? "●" : ""}
                                </div>
                            ))}
                        </div>

                        {/* Keypad */}
                        <div className="grid grid-cols-3 gap-6 w-full max-w-md">
                            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                                <button
                                    key={n}
                                    onClick={() => handlePinPress(n)}
                                    disabled={loading}
                                    className="h-24 rounded-3xl bg-zinc-900/80 border-2 border-zinc-800 text-white text-4xl font-black hover:bg-zinc-800 hover:border-primary/30 transition-all active:scale-90"
                                >
                                    {n}
                                </button>
                            ))}
                            <div className="h-24"></div>
                            <button
                                onClick={() => handlePinPress("0")}
                                disabled={loading}
                                className="h-24 rounded-3xl bg-zinc-900/80 border-2 border-zinc-800 text-white text-4xl font-black hover:bg-zinc-800 active:scale-90"
                            >
                                0
                            </button>
                            <button
                                onClick={handlePinDelete}
                                disabled={loading}
                                className="h-24 rounded-3xl bg-zinc-900 text-zinc-500 flex items-center justify-center hover:text-white transition-all active:scale-90"
                            >
                                <X className="w-10 h-10" />
                            </button>
                        </div>

                        {error && (
                            <div className="mt-12 text-red-500 text-xl font-black uppercase tracking-widest animate-bounce">
                                {error}
                            </div>
                        )}
                    </div>
                )}

                {view === "action" && activeStaff && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full animate-in slide-in-from-bottom-12 duration-500">
                        {/* Status Card */}
                        <div className="flex flex-col h-full">
                            <div className="mb-8">
                                <span className="text-primary text-sm font-black uppercase tracking-[0.3em]">Hello, {activeStaff.name}</span>
                                <h3 className="text-6xl font-black tracking-tight mt-2 flex items-center gap-4">
                                    {activeShift ? "Active Shift" : "Shift Ended"}
                                    {loading && <Loader2 className="w-10 h-10 animate-spin text-zinc-700" />}
                                </h3>
                            </div>

                            <div className="space-y-6 flex-1">
                                {activeShift ? (
                                    <>
                                        <div className="p-8 rounded-3xl bg-zinc-900 border-2 border-zinc-800">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                                    <Clock className="w-8 h-8 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Clocked In At</p>
                                                    <p className="text-3xl font-black">{format(activeShift.clockIn.toDate(), "HH:mm")}</p>
                                                </div>
                                                <div className="ml-auto text-right">
                                                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Elapsed</p>
                                                    <p className="text-3xl font-black text-emerald-400">
                                                        {formatMins(differenceInMinutes(currentTime, activeShift.clockIn.toDate()))}
                                                    </p>
                                                </div>
                                            </div>

                                            {activeShift.breaks?.some(b => b.end === null) && (
                                                <div className="mt-8 pt-8 border-t border-zinc-800 flex items-center gap-6 animate-pulse">
                                                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                                        <Coffee className="w-6 h-6 text-amber-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-amber-500 text-xs font-black uppercase tracking-widest">On Break</p>
                                                        <p className="text-xl font-bold">Since {format(activeShift.breaks.find(b => b.end === null)!.start.toDate(), "HH:mm")}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 pt-4">
                                            <Button
                                                onClick={handleToggleBreak}
                                                disabled={loading}
                                                className={`h-24 rounded-3xl text-xl font-black transition-all border-4 ${activeShift.breaks?.some(b => b.end === null)
                                                    ? "bg-amber-500 text-black border-amber-400 hover:bg-amber-600 shadow-[0_0_20px_#f59e0b22]"
                                                    : "bg-transparent border-zinc-800 text-zinc-400 hover:text-white"
                                                    }`}
                                            >
                                                {activeShift.breaks?.some(b => b.end === null) ? (
                                                    <><PlayCircle className="w-6 h-6 mr-3" /> END BREAK</>
                                                ) : (
                                                    <><Coffee className="w-6 h-6 mr-3" /> START BREAK</>
                                                )}
                                            </Button>

                                            <Button
                                                onClick={handleToggleClock}
                                                disabled={loading}
                                                className="h-24 rounded-3xl bg-red-600 hover:bg-red-700 text-white text-xl font-black border-4 border-red-500 transition-all shadow-[0_0_20px_#ef444422]"
                                            >
                                                CLOCK OUT
                                            </Button>
                                        </div>

                                        {/* Mobile Exit Button */}
                                        <Button
                                            onClick={resetKiosk}
                                            variant="outline"
                                            className="w-full mt-6 h-16 rounded-2xl border-2 border-zinc-800 text-zinc-500 font-bold uppercase tracking-widest hover:text-primary lg:hidden"
                                        >
                                            <X className="w-5 h-5 mr-2" /> Finish & Logout
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-12 rounded-3xl bg-zinc-900 border-2 border-dashed border-zinc-800 text-center">
                                            <Clock className="w-16 h-16 text-zinc-800 mx-auto mb-6" />
                                            <p className="text-2xl font-black text-zinc-500">You are currently clocked out</p>
                                        </div>
                                        <Button
                                            onClick={handleToggleClock}
                                            disabled={loading}
                                            className="w-full h-32 rounded-3xl bg-primary hover:opacity-90 text-black text-4xl font-black border-4 border-black/10 transition-all shadow-[0_0_30px_var(--brand-primary)]/10"
                                        >
                                            CLOCK IN
                                        </Button>

                                        {/* Mobile Exit Button */}
                                        <Button
                                            onClick={resetKiosk}
                                            variant="outline"
                                            className="w-full mt-8 h-16 rounded-2xl border-2 border-zinc-800 text-zinc-500 font-bold uppercase tracking-widest hover:text-primary lg:hidden"
                                        >
                                            <X className="w-5 h-5 mr-2" /> Return to Welcome
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Rota Preview (Desktop) & Exit Controls (Shared) */}
                        <div className="flex flex-col h-full lg:border-l lg:border-zinc-900 lg:pl-12">
                            <div className="hidden lg:block">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="text-xl font-black uppercase tracking-tighter text-zinc-600 flex items-center gap-3">
                                        <Calendar className="w-5 h-5" /> Your Weekly Rota
                                    </h4>
                                    <Button
                                        variant="ghost" onClick={() => setView("rota")}
                                        className="text-primary font-black text-xs uppercase"
                                    >
                                        Full View <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>

                                <div className="space-y-3 flex-1 mb-12">
                                    {DAY_NAMES.map((day, idx) => {
                                        const entry = staffRota.find(e => e.day === idx);
                                        const isToday = idx === (new Date().getDay() + 6) % 7;
                                        return (
                                            <div
                                                key={day}
                                                className={`p-5 rounded-2xl flex items-center justify-between transition-all ${isToday ? 'bg-[#d1d119]/5 border-2 border-[#d1d119]/20' : 'bg-zinc-900/40 border border-zinc-900'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className={`w-10 text-xs font-black uppercase ${isToday ? 'text-primary' : 'text-zinc-600'}`}>{day}</span>
                                                    <span className={`text-lg font-bold ${isToday ? 'text-white' : 'text-zinc-400'}`}>
                                                        {entry ? `${entry.startTime} – ${entry.endTime}` : "OFF"}
                                                    </span>
                                                </div>
                                                {isToday && entry && (
                                                    <span className="bg-primary text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Today</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <Button
                                onClick={resetKiosk}
                                variant="ghost"
                                className="mt-8 text-zinc-700 hover:text-white font-black text-lg py-8 border-4 border-zinc-900 rounded-3xl group"
                            >
                                <X className="w-6 h-6 mr-2 group-hover:rotate-90 transition-all" /> CLOSE SESSION
                            </Button>
                        </div>
                    </div>
                )}

                {view === "rota" && activeStaff && (
                    <div className="w-full max-w-3xl animate-in zoom-in-95 duration-500">
                        <div className="flex items-center justify-between mb-12">
                            <h3 className="text-4xl font-black tracking-tighter">Your Weekly Schedule</h3>
                            <Button onClick={() => setView("action")} className="bg-zinc-900 text-white rounded-xl">
                                <ChevronLeft className="mr-2" /> Back
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {DAY_NAMES.map((day, idx) => {
                                const entry = staffRota.find(e => e.day === idx);
                                return (
                                    <div key={day} className="flex items-center bg-zinc-900 p-8 rounded-3xl border border-zinc-800">
                                        <div className="w-24 text-2xl font-black text-zinc-700">{day}</div>
                                        <div className="text-4xl font-black">
                                            {entry ? (
                                                <>{entry.startTime} <span className="text-zinc-800">→</span> {entry.endTime}</>
                                            ) : "DEDICATED OFF"}
                                        </div>
                                        {entry && <div className="ml-auto text-zinc-500 font-bold uppercase tracking-widest text-sm">{entry.role}</div>}
                                    </div>
                                );
                            })}
                        </div>

                        <Button
                            onClick={resetKiosk}
                            className="w-full mt-12 h-20 rounded-3xl bg-zinc-800 text-white text-xl font-bold"
                        >
                            Return to Wall
                        </Button>
                    </div>
                )}
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-12 flex items-center gap-8 text-zinc-800 font-black text-xs uppercase tracking-[0.5em]">
                <span>Accuracy</span>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                <span>Reliability</span>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                <span>Efficiency</span>
            </div>

            <button
                onClick={() => setIsAppLocked(!isAppLocked)}
                className="absolute bottom-8 right-8 text-zinc-900 hover:text-zinc-700 p-2"
            >
                {isAppLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5 text-primary" />}
            </button>
        </div>
    );
}
