"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    getAllActiveShiftsToday, getTodayCompletedShifts,
    getAllStaff
} from "@/lib/adminService";
import { Shift, StaffMember } from "@/lib/staffService";
import {
    Users, Clock, CheckCircle2, AlertCircle,
    Loader2, ArrowUpRight, UserCheck, BarChart3,
    CalendarClock
} from "lucide-react";
import { BRAND_CONFIG } from "@/lib/brandingConfig";
import Link from "next/link";

export default function AdminDashboard() {
    const [activeShifts, setActiveShifts] = useState<Shift[]>([]);
    const [completedShifts, setCompletedShifts] = useState<Shift[]>([]);
    const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [active, completed, staff] = await Promise.all([
                    getAllActiveShiftsToday(),
                    getTodayCompletedShifts(),
                    getAllStaff()
                ]);
                setActiveShifts(active);
                setCompletedShifts(completed);
                setAllStaff(staff);
            } catch (e) {
                console.error("Dashboard load error", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const totalPaidToday = completedShifts.reduce((acc, s) => acc + (s.paidMinutes ?? 0), 0);
    const activeStaffCount = allStaff.filter(s => s.isActive).length;

    const formatMins = (minutes: number) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-zinc-500 mt-4 font-medium">Loading real-time stats...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">System Overview</h1>
                <p className="text-zinc-500 mt-1">Real-time snapshots for {format(new Date(), "EEEE, MMMM do")}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden group">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <Users className="w-5 h-5 text-blue-400" />
                            <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Team</span>
                        </div>
                        <CardTitle className="text-3xl font-black text-white mt-2">{activeStaffCount}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-zinc-500 text-xs font-medium">Total active staff members</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <Clock className="w-5 h-5 text-emerald-400" />
                            <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Live</span>
                        </div>
                        <CardTitle className="text-3xl font-black text-white mt-2">{activeShifts.length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-zinc-500 text-xs font-medium">Currently clocked in</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                            <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Shifts</span>
                        </div>
                        <CardTitle className="text-3xl font-black text-white mt-2">{completedShifts.length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-zinc-500 text-xs font-medium">Completed today</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <BarChart3 className="w-5 h-5 text-purple-400" />
                            <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Hours</span>
                        </div>
                        <CardTitle className="text-3xl font-black text-white mt-2">{formatMins(totalPaidToday)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-zinc-500 text-xs font-medium">Total paid minutes today</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* Currently In */}
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl h-full flex flex-col">
                    <CardHeader className="border-b border-zinc-800/50 py-5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <UserCheck className="w-5 h-5 text-emerald-400" />
                                Currently Clocked In
                            </CardTitle>
                            <span className="text-zinc-600 text-xs font-bold">{activeShifts.length} Live</span>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0">
                        <div className="divide-y divide-zinc-800/30">
                            {activeShifts.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Clock className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                                    <p className="text-zinc-600 text-sm font-medium">No active shifts right now</p>
                                </div>
                            ) : (
                                activeShifts.map(s => (
                                    <div key={s.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/20 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <div>
                                                <p className="text-white font-bold text-sm tracking-tight">{s.staffName}</p>
                                                <p className="text-zinc-500 text-xs">Clocked in at {format(s.clockIn.toDate(), "HH:mm")}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-zinc-400 font-mono text-xs">{formatMins(Math.round((Date.now() - s.clockIn.toMillis()) / 60000))}</p>
                                            <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">Duration</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="space-y-6">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest ml-1">Management Shortcuts</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link href="/admin/staff" className="group">
                            <div className="h-full p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-primary/50 transition-all shadow-lg active:scale-[0.98]">
                                <div className="w-12 h-12 bg-blue-400/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                                    <Users className="w-6 h-6 text-blue-400" />
                                </div>
                                <h4 className="text-white font-bold mb-1 flex items-center gap-2">
                                    Staff Roster
                                    <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 transition-all" />
                                </h4>
                                <p className="text-zinc-500 text-xs leading-relaxed">Add new team members or update existing PINs and labels.</p>
                            </div>
                        </Link>

                        <Link href="/admin/rota" className="group">
                            <div className="h-full p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-primary/50 transition-all shadow-lg active:scale-[0.98]">
                                <div className="w-12 h-12 bg-amber-400/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                                    <CalendarClock className="w-6 h-6 text-amber-400" />
                                </div>
                                <h4 className="text-white font-bold mb-1 flex items-center gap-2">
                                    Weekly Rota
                                    <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-all" />
                                </h4>
                                <p className="text-zinc-500 text-xs leading-relaxed">Plan the upcoming week and share shift times with the team.</p>
                            </div>
                        </Link>
                    </div>

                    <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-800 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <AlertCircle className="w-16 h-16 text-primary" />
                        </div>
                        <CardContent className="p-8">
                            <h4 className="text-white font-black text-xl mb-2">Automated Rules</h4>
                            <p className="text-zinc-400 text-sm mb-6 leading-relaxed max-w-sm">
                                Shifts are currently set to auto-close at midnight if staff forget to clock out.
                                Daily reports will be compiled at 00:05.
                            </p>
                            <Link href="/admin/settings">
                                <Button className="bg-primary hover:opacity-90 text-black font-bold h-11 px-6 rounded-xl">
                                    Update Settings
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
