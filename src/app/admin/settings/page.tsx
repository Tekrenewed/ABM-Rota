"use client";

import { useState, useEffect } from "react";
import { getSettings, saveSettings, AppSettings } from "@/lib/adminService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Save, Loader2, Clock, Mail, Coffee,
    ShieldAlert, Info, BellRing, CheckCircle2
} from "lucide-react";

export default function SettingsPage() {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getSettings();
                setSettings(data);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;
        setSaving(true);
        setSuccess(false);
        try {
            await saveSettings(settings);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } finally {
            setSaving(false);
        }
    };

    if (loading || !settings) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#d1d119]" />
                <p className="text-zinc-500 mt-4 font-medium">Loading system settings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Global Settings</h1>
                    <p className="text-zinc-500 mt-1">Configure system automation and business rules</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Shop Information Card */}
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-800/50 bg-zinc-950/20">
                        <div className="flex items-center gap-3">
                            <Info className="w-5 h-5 text-blue-400" />
                            <CardTitle className="text-lg text-white font-bold">Shop Information</CardTitle>
                        </div>
                        <CardDescription className="text-zinc-500">
                            General details about your restaurant.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Store Name</label>
                                <Input
                                    className="bg-zinc-950 border-zinc-800 h-12 rounded-xl"
                                    value={settings.shopName}
                                    onChange={e => setSettings({ ...settings, shopName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Currency Symbol</label>
                                <Input
                                    className="bg-zinc-950 border-zinc-800 h-12 rounded-xl w-20 text-center text-lg font-bold"
                                    value={settings.currencySymbol}
                                    onChange={e => setSettings({ ...settings, currencySymbol: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Shop Address</label>
                            <Input
                                className="bg-zinc-950 border-zinc-800 h-12 rounded-xl"
                                placeholder="e.g. 123 High Street, London..."
                                value={settings.shopAddress}
                                onChange={e => setSettings({ ...settings, shopAddress: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Automation Card */}
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
                    <CardHeader className="border-b border-zinc-800/50">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-[#d1d119]" />
                            <CardTitle className="text-lg text-white font-bold">Shift Automation</CardTitle>
                        </div>
                        <CardDescription className="text-zinc-500">
                            Set up rules for shifts that aren&apos;t manually clocked out.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h4 className="text-white font-bold text-sm">Nightly Closing Time</h4>
                                <p className="text-zinc-500 text-xs">All active shifts will be automatically closed at this hour.</p>
                            </div>
                            <div className="w-full sm:w-32">
                                <Input
                                    type="time"
                                    className="bg-zinc-950 border-zinc-800 h-11 text-center font-bold text-white rounded-xl"
                                    value={settings.closingTime}
                                    onChange={e => setSettings({ ...settings, closingTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Breaks Card */}
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
                    <CardHeader className="border-b border-zinc-800/50">
                        <div className="flex items-center gap-3">
                            <Coffee className="w-5 h-5 text-amber-400" />
                            <CardTitle className="text-lg text-white font-bold">Break Rules</CardTitle>
                        </div>
                        <CardDescription className="text-zinc-500">
                            Automatic deductions that occur if staff don&apos;t log their breaks manually.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h4 className="text-white font-bold text-sm">Moderate Shift (4–6 hours)</h4>
                                <p className="text-zinc-500 text-xs">Deduction amount in minutes.</p>
                            </div>
                            <div className="w-full sm:w-32 flex items-center gap-2">
                                <Input
                                    type="number"
                                    className="bg-zinc-950 border-zinc-800 h-11 text-center font-bold text-white rounded-xl"
                                    value={settings.breakRule4h}
                                    onChange={e => setSettings({ ...settings, breakRule4h: parseInt(e.target.value) || 0 })}
                                />
                                <span className="text-zinc-600 font-bold text-xs uppercase">min</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-zinc-800/30">
                            <div className="space-y-1">
                                <h4 className="text-white font-bold text-sm">Full Shift (6+ hours)</h4>
                                <p className="text-zinc-500 text-xs">Deduction amount in minutes.</p>
                            </div>
                            <div className="w-full sm:w-32 flex items-center gap-2">
                                <Input
                                    type="number"
                                    className="bg-zinc-950 border-zinc-800 h-11 text-center font-bold text-white rounded-xl"
                                    value={settings.breakRule6h}
                                    onChange={e => setSettings({ ...settings, breakRule6h: parseInt(e.target.value) || 0 })}
                                />
                                <span className="text-zinc-600 font-bold text-xs uppercase">min</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Security Card */}
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-800/50 bg-red-400/5">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="w-5 h-5 text-red-400" />
                            <CardTitle className="text-lg text-white font-bold">Admin Security</CardTitle>
                        </div>
                        <CardDescription className="text-zinc-500">
                            Manage dashboard access credentials.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h4 className="text-white font-bold text-sm">6-Digit Admin PIN</h4>
                                <p className="text-zinc-500 text-xs">Used to access this administration panel.</p>
                            </div>
                            <div className="w-full sm:w-48">
                                <Input
                                    type="text" maxLength={6} pattern="\d{6}"
                                    autoComplete="off"
                                    className="bg-zinc-950 border-zinc-800 h-11 text-center font-black tracking-[0.3em] text-[#d1d119] rounded-xl text-lg"
                                    value={settings.adminPin}
                                    onChange={e => setSettings({ ...settings, adminPin: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Reporting Card */}
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
                    <CardHeader className="border-b border-zinc-800/50">
                        <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-purple-400" />
                            <CardTitle className="text-lg text-white font-bold">Reporting & Alerts</CardTitle>
                        </div>
                        <CardDescription className="text-zinc-500">
                            Configure daily and weekly summary emails.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h4 className="text-white font-bold text-sm">Daily Email Reports</h4>
                                <p className="text-zinc-500 text-xs italic">Receive a summary of all shifts after {settings.closingTime}.</p>
                            </div>
                            <Switch
                                checked={settings.emailReportsEnabled}
                                onCheckedChange={v => setSettings({ ...settings, emailReportsEnabled: v })}
                            />
                        </div>

                        <div className={`space-y-4 transition-all ${!settings.emailReportsEnabled && 'opacity-30 pointer-events-none'}`}>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Owner Notification Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                    <Input
                                        type="email"
                                        placeholder="e.g. owner@example.com"
                                        className="pl-11 bg-zinc-950 border-zinc-800 h-12 rounded-xl"
                                        value={settings.ownerEmail}
                                        onChange={e => setSettings({ ...settings, ownerEmail: e.target.value })}
                                    />
                                </div>
                            </div>
                            <Button
                                type="button" variant="outline" size="sm"
                                className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 text-[10px] font-black uppercase tracking-widest h-8 px-4 rounded-lg"
                            >
                                <BellRing className="w-3 h-3 mr-2" /> Send Test Report
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Save bar */}
                <div className="flex items-center justify-end gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl sticky bottom-6 shadow-2xl z-20">
                    {success && (
                        <div className="flex items-center text-emerald-400 text-sm font-bold gap-2 mr-auto animate-in fade-in slide-in-from-left-4">
                            <CheckCircle2 className="w-5 h-5" />
                            Settings saved successfully
                        </div>
                    )}
                    <Button
                        type="submit"
                        disabled={saving}
                        className="bg-[#d1d119] hover:bg-[#b0b012] text-black font-extrabold h-12 px-10 rounded-xl shadow-lg shadow-[#d1d119]/5"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                        Save Global Settings
                    </Button>
                </div>
            </form>
        </div>
    );
}
