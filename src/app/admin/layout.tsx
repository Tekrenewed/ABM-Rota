"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAdminAuthed, clearAdminAuth } from "@/lib/adminService";
import {
    LayoutDashboard, Users, CalendarClock, Settings,
    BarChart3, LogOut, Loader2, Menu, X
} from "lucide-react";
import Link from "next/link";
import { BRAND_CONFIG } from "@/lib/brandingConfig";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const authed = isAdminAuthed();
        const isLoginPage = pathname === "/admin" || pathname === "/admin/";

        if (isLoginPage) {
            if (isAuthed !== false) setIsAuthed(false);
            return;
        }

        if (!authed) {
            router.replace("/admin");
        } else {
            if (isAuthed !== true) setIsAuthed(true);
        }
    }, [router, pathname, isAuthed]);

    const handleLogout = () => {
        clearAdminAuth();
        router.push("/admin");
    };

    if (isAuthed === null) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // If we're on the login page, just show the login content without the sidebar
    if (pathname === "/admin" || pathname === "/admin/") {
        return <>{children}</>;
    }

    const navItems = [
        { name: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
        { name: "Staff Management", href: "/admin/staff", icon: Users },
        { name: "Weekly Rota", href: "/admin/rota", icon: CalendarClock },
        { name: "Global Settings", href: "/admin/settings", icon: Settings },
        { name: "Detailed Reports", href: "/admin/reports", icon: BarChart3 },
    ];

    return (
        <div className="min-h-screen bg-zinc-950 flex">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 bg-zinc-900 border-r border-zinc-800 flex-col sticky top-0 h-screen">
                <div className="p-6 border-b border-zinc-800">
                    <h2 className="text-xl font-black text-primary tracking-tight">{BRAND_CONFIG.clientName}</h2>
                    <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest font-bold">Admin Panel</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive
                                    ? "bg-primary text-black shadow-lg shadow-primary/10"
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-semibold text-zinc-500 hover:text-red-400 hover:bg-red-400/5 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        Log Out
                    </button>
                </div>
            </aside>

            {/* Mobile Header / Sidebar Overlay */}
            <div className="md:hidden flex flex-col w-full">
                <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6">
                    <h2 className="text-lg font-black text-primary tracking-tight">{BRAND_CONFIG.clientName} Admin</h2>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-zinc-400">
                        {isSidebarOpen ? <X /> : <Menu />}
                    </button>
                </header>

                {isSidebarOpen && (
                    <div className="fixed inset-0 top-16 z-50 bg-zinc-950 p-6 flex flex-col space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-4 rounded-xl text-lg font-bold transition-all ${isActive
                                        ? "bg-primary text-black"
                                        : "text-zinc-400 hover:bg-zinc-900"
                                        }`}
                                >
                                    <Icon className="w-6 h-6" />
                                    {item.name}
                                </Link>
                            );
                        })}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-4 w-full rounded-xl text-lg font-bold text-red-400 mt-4 bg-red-400/5"
                        >
                            <LogOut className="w-6 h-6" />
                            Log Out
                        </button>
                    </div>
                )}

                <main className="flex-1 overflow-auto">{children}</main>
            </div>

            {/* Main Content (Desktop) */}
            <main className="hidden md:block flex-1 overflow-auto">
                <div className="p-8 max-w-6xl mx-auto">{children}</div>
            </main>
        </div>
    );
}
