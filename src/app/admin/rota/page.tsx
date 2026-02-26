"use client";

import { useState, useEffect, useCallback } from "react";
import {
    format, startOfWeek, endOfWeek, addWeeks, subWeeks,
    addDays
} from "date-fns";
import {
    getWeekRota, saveWeekRota, RotaEntry,
    DAY_NAMES, ROLES
} from "@/lib/rotaService";
import { getAllStaff } from "@/lib/adminService";
import { StaffMember } from "@/lib/staffService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ChevronLeft, ChevronRight, Save, Plus,
    Trash2, Clock, Loader2, Calendar,
    User, MousePointer2, AlertCircle
} from "lucide-react";

export default function RotaBuilder() {
    const [weekStart, setWeekStart] = useState(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 })
    );
    const [rotaEntries, setRotaEntries] = useState<RotaEntry[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [staffData, rotaData] = await Promise.all([
                getAllStaff(),
                getWeekRota(weekStart)
            ]);
            setStaff(staffData.filter(s => s.isActive));
            setRotaEntries(rotaData?.entries || []);
            setHasUnsavedChanges(false);
        } finally {
            setLoading(false);
        }
    }, [weekStart]);

    useEffect(() => { loadData(); }, [loadData]);

    const addEntry = (day: number) => {
        const newEntry: RotaEntry = {
            staffId: staff[0]?.id || "",
            staffName: staff[0]?.name || "",
            role: staff[0]?.role || "kitchen",
            day,
            startTime: "09:00",
            endTime: "17:00"
        };
        setRotaEntries([...rotaEntries, newEntry]);
        setHasUnsavedChanges(true);
    };

    const updateEntry = (index: number, updates: Partial<RotaEntry>) => {
        const updated = [...rotaEntries];
        const entry = { ...updated[index], ...updates };

        // If staff changed, auto-update name/role
        if (updates.staffId) {
            const s = staff.find(st => st.id === updates.staffId);
            if (s) {
                entry.staffName = s.name;
                entry.role = s.role;
            }
        }

        updated[index] = entry;
        setRotaEntries(updated);
        setHasUnsavedChanges(true);
    };

    const removeEntry = (index: number) => {
        setRotaEntries(rotaEntries.filter((_, i) => i !== index));
        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveWeekRota(weekStart, rotaEntries);
            setHasUnsavedChanges(false);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#d1d119]" />
                <p className="text-zinc-500 mt-4 font-medium">Loading weekly rota...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Rota Builder</h1>
                    <p className="text-zinc-500 mt-1">Assign staff shifts for the week ahead</p>
                </div>

                <div className="flex items-center gap-3">
                    {hasUnsavedChanges && (
                        <div className="flex items-center text-amber-500 text-xs font-bold uppercase gap-2 mr-2 bg-amber-500/5 px-3 py-2 rounded-lg border border-amber-500/10">
                            <AlertCircle className="w-4 h-4" />
                            Unsaved Changes
                        </div>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={saving || !hasUnsavedChanges}
                        className="bg-[#d1d119] hover:bg-[#b0b012] text-black font-extrabold h-12 px-8 rounded-xl shadow-lg shadow-[#d1d119]/10"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                        Save Rota
                    </Button>
                </div>
            </div>

            {/* Week Picker */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4 flex items-center justify-between">
                    <Button
                        variant="ghost" className="text-zinc-400 hover:text-white"
                        onClick={() => setWeekStart(subWeeks(weekStart, 1))}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <div className="text-center">
                        <div className="text-white font-black text-xl tracking-tight">
                            {format(weekStart, "dd MMM")} – {format(weekEnd, "dd MMM yyyy")}
                        </div>
                        <div className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">
                            {rotaEntries.length} total shifts assigned
                        </div>
                    </div>
                    <Button
                        variant="ghost" className="text-zinc-400 hover:text-white"
                        onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                    >
                        <ChevronRight className="w-6 h-6" />
                    </Button>
                </CardContent>
            </Card>

            {/* Rota Grid */}
            <div className="grid grid-cols-1 gap-6">
                {DAY_NAMES.map((name, dayIndex) => {
                    const dayEntries = rotaEntries
                        .map((e, i) => ({ ...e, index: i }))
                        .filter(e => e.day === dayIndex)
                        .sort((a, b) => a.startTime.localeCompare(b.startTime));

                    const date = addDays(weekStart, dayIndex);

                    return (
                        <Card key={name} className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden group">
                            <CardHeader className="py-4 px-6 border-b border-zinc-800 flex flex-row items-center justify-between bg-zinc-950/30">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border font-black ${format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                                            ? "bg-[#d1d119] border-[#d1d119] text-black"
                                            : "bg-zinc-800 border-zinc-700 text-white"
                                        }`}>
                                        <span className="text-[10px] uppercase">{name}</span>
                                        <span className="text-lg -mt-1">{format(date, "d")}</span>
                                    </div>
                                    <CardTitle className="text-white font-bold">{format(date, "EEEE, Mo MMM")}</CardTitle>
                                </div>
                                <Button
                                    variant="outline" size="sm"
                                    className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg text-xs"
                                    onClick={() => addEntry(dayIndex)}
                                >
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    Add Shift
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-zinc-800/30">
                                    {dayEntries.length === 0 ? (
                                        <div className="p-8 text-center bg-zinc-950/10">
                                            <p className="text-zinc-600 text-sm font-medium">No shifts assigned for this day</p>
                                        </div>
                                    ) : (
                                        dayEntries.map((e) => (
                                            <div key={e.index} className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center hover:bg-zinc-800/20 transition-all">
                                                {/* Staff Selective */}
                                                <div className="sm:col-span-5 flex items-center gap-3">
                                                    <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 text-zinc-600">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <select
                                                            className="w-full bg-zinc-950 border border-zinc-800 h-10 rounded-lg px-3 text-xs font-bold text-white appearance-none cursor-pointer"
                                                            value={e.staffId}
                                                            onChange={ev => updateEntry(e.index, { staffId: ev.target.value })}
                                                        >
                                                            {staff.map(s => (
                                                                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Times */}
                                                <div className="sm:col-span-5 flex items-center gap-3">
                                                    <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 text-zinc-600">
                                                        <Clock className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <Input
                                                            type="time"
                                                            className="bg-zinc-950 border-zinc-800 h-10 rounded-lg text-xs font-bold text-center px-2"
                                                            value={e.startTime}
                                                            onChange={ev => updateEntry(e.index, { startTime: ev.target.value })}
                                                        />
                                                        <span className="text-zinc-600 text-xs font-black">→</span>
                                                        <Input
                                                            type="time"
                                                            className="bg-zinc-950 border-zinc-800 h-10 rounded-lg text-xs font-bold text-center px-2"
                                                            value={e.endTime}
                                                            onChange={ev => updateEntry(e.index, { endTime: ev.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="sm:col-span-2 flex justify-end">
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="text-zinc-600 hover:text-red-400 hover:bg-red-400/5 h-10 w-10 p-0"
                                                        onClick={() => removeEntry(e.index)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
