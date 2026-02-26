"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    getAllStaff, createStaffMember, updateStaffMember,
    deactivateStaff, reactivateStaff
} from "@/lib/adminService";
import { StaffMember } from "@/lib/staffService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Plus, UserPlus, Edit3, Trash2,
    CheckCircle2, XCircle, Search,
    Loader2, MoreVertical, Shield,
    UserCheck, UserX
} from "lucide-react";
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function StaffManagement() {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
    const [saving, setSaving] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        name: "", role: "kitchen", pin: "", staffCode: ""
    });

    const loadStaff = async () => {
        setLoading(true);
        try {
            const data = await getAllStaff();
            setStaff(data);
        } catch (e) {
            console.error("Staff load error", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadStaff(); }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await createStaffMember(formData);
            await loadStaff();
            setIsAddOpen(false);
            setFormData({ name: "", role: "kitchen", pin: "", staffCode: "" });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStaff) return;
        setSaving(true);
        try {
            await updateStaffMember(editingStaff.id, formData);
            await loadStaff();
            setIsEditOpen(false);
            setEditingStaff(null);
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (s: StaffMember) => {
        if (s.isActive) await deactivateStaff(s.id);
        else await reactivateStaff(s.id);
        loadStaff();
    };

    const openEdit = (s: StaffMember) => {
        setEditingStaff(s);
        setFormData({
            name: s.name,
            role: s.role,
            pin: s.pin,
            staffCode: s.staffCode || ""
        });
        setIsEditOpen(true);
    };

    const filtered = staff.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.staffCode?.toLowerCase().includes(search.toLowerCase()) ||
        s.role.toLowerCase().includes(search.toLowerCase())
    );


    if (loading && staff.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#d1d119]" />
                <p className="text-zinc-500 mt-4 font-medium">Loading staff roster...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Staff Management</h1>
                    <p className="text-zinc-500 mt-1">Add, edit, or remove members of your team</p>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#d1d119] hover:bg-[#b0b012] text-black font-bold h-12 px-6 rounded-xl">
                            <UserPlus className="w-5 h-5 mr-2" />
                            Add New Staff
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
                        <form onSubmit={handleAdd}>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black">Add Team Member</DialogTitle>
                                <DialogDescription className="text-zinc-500">
                                    Create a new staff profile. They will be able to log in immediately.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Full Name</label>
                                    <Input
                                        required className="bg-zinc-950 border-zinc-800 h-12 rounded-xl"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Staff Code</label>
                                        <Input
                                            placeholder="e.g. RTW01"
                                            className="bg-zinc-950 border-zinc-800 h-12 rounded-xl uppercase"
                                            value={formData.staffCode}
                                            onChange={e => setFormData({ ...formData, staffCode: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Role</label>
                                        <select
                                            className="w-full bg-zinc-950 border border-zinc-800 h-12 rounded-xl px-4 text-white font-bold"
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                            title="Staff Role Selection"
                                        >
                                            <option value="kitchen">Kitchen</option>
                                            <option value="counter">Counter</option>
                                            <option value="driver">Driver</option>
                                            <option value="manager">Manager</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">4-Digit Login PIN</label>
                                    <Input
                                        required maxLength={4} pattern="\d{4}" placeholder="0000"
                                        className="bg-zinc-950 border-zinc-800 h-12 rounded-xl tracking-widest text-center text-xl font-black"
                                        value={formData.pin}
                                        onChange={e => setFormData({ ...formData, pin: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button" variant="ghost" className="text-zinc-500"
                                    onClick={() => setIsAddOpen(false)}
                                >Cancel</Button>
                                <Button
                                    className="bg-[#d1d119] hover:bg-[#b0b012] text-black font-bold px-8 rounded-xl h-11"
                                    disabled={saving}
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Profile"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        placeholder="Search by name, code, or role..."
                        className="pl-11 bg-zinc-950 border-zinc-800 h-12 rounded-xl"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(s => (
                    <Card key={s.id} className={`bg-zinc-900 border-zinc-800 shadow-xl relative overflow-hidden transition-all hover:border-zinc-700 ${!s.isActive && "opacity-60 grayscale"}`}>
                        {!s.isActive && (
                            <div className="absolute top-3 right-3 z-10">
                                <span className="bg-zinc-800 text-zinc-500 text-[10px] font-black uppercase px-2 py-1 rounded">Inactive</span>
                            </div>
                        )}
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black uppercase border ${s.role === 'manager' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                                        s.role === 'kitchen' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                            s.role === 'driver' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                                        }`}>
                                        {s.name.substring(0, 2)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-bold leading-none">{s.name}</h3>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="w-6 h-6 text-zinc-600 hover:text-[#d1d119] hover:bg-zinc-800 rounded-md"
                                                onClick={() => openEdit(s)}
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-zinc-600 text-[10px] uppercase font-black tracking-widest">{s.staffCode || 'No Code'}</span>
                                            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                                            <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">{s.role}</span>
                                        </div>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-zinc-600 hover:text-white hover:bg-zinc-800 -mr-2">
                                            <MoreVertical className="w-5 h-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white min-w-[160px]">
                                        <DropdownMenuItem onClick={() => openEdit(s)} className="cursor-pointer font-medium focus:bg-zinc-800 py-2.5">
                                            <Edit3 className="w-4 h-4 mr-2 text-zinc-400" /> Edit Profile
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => toggleStatus(s)} className={`cursor-pointer font-medium focus:bg-zinc-800 py-2.5 ${s.isActive ? "text-red-400" : "text-emerald-400"}`}>
                                            {s.isActive ? (
                                                <><UserX className="w-4 h-4 mr-2" /> Deactivate</>
                                            ) : (
                                                <><UserCheck className="w-4 h-4 mr-2" /> Reactivate</>
                                            )}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800/50">
                                <div className="bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-800/30">
                                    <p className="text-zinc-600 text-[9px] uppercase font-black tracking-widest mb-1">Login PIN</p>
                                    <div className="flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5 text-[#d1d119]/50" />
                                        <span className="text-white font-black tracking-[0.2em]">{s.pin}</span>
                                    </div>
                                </div>
                                <div className="bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-800/30">
                                    <p className="text-zinc-600 text-[9px] uppercase font-black tracking-widest mb-1">Weekly Target</p>
                                    <p className="text-zinc-400 font-bold">——</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black">Edit Profile: {editingStaff?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Full Name</label>
                                <Input
                                    required className="bg-zinc-950 border-zinc-800 h-12 rounded-xl"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Staff Code</label>
                                    <Input
                                        className="bg-zinc-950 border-zinc-800 h-12 rounded-xl uppercase"
                                        value={formData.staffCode}
                                        onChange={e => setFormData({ ...formData, staffCode: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Role</label>
                                    <select
                                        className="w-full bg-zinc-950 border border-zinc-800 h-12 rounded-xl px-3 text-sm"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="kitchen">Kitchen</option>
                                        <option value="counter">Counter</option>
                                        <option value="driver">Driver</option>
                                        <option value="manager">Manager</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Login PIN</label>
                                <Input
                                    required maxLength={4} pattern="\d{4}"
                                    className="bg-zinc-950 border-zinc-800 h-12 rounded-xl tracking-widest text-center text-xl font-black text-[#d1d119]"
                                    value={formData.pin}
                                    onChange={e => setFormData({ ...formData, pin: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button" variant="ghost" className="text-zinc-500"
                                onClick={() => setIsEditOpen(false)}
                            >Cancel</Button>
                            <Button
                                className="bg-[#d1d119] hover:bg-[#b0b012] text-black font-bold px-8 rounded-xl h-11"
                                disabled={saving}
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
