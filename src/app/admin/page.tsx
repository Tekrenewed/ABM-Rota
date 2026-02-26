"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyAdminPin, setAdminAuthed } from "@/lib/adminService";
import { Loader2, Lock, ShieldCheck, X } from "lucide-react";

export default function AdminLoginPage() {
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handlePress = (num: string) => {
        if (pin.length < 6) {
            setPin(pin + num);
            setError(false);
        }
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
        setError(false);
    };

    const handleLogin = async () => {
        if (pin.length !== 6) return;
        setLoading(true);
        setError(false);

        // Artificial delay for security/feedback feel
        await new Promise((r) => setTimeout(r, 600));

        if (await verifyAdminPin(pin)) {
            setAdminAuthed();
            router.push("/admin/dashboard");
        } else {
            setError(true);
            setPin("");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm flex flex-col items-center">
                <div className="mb-8 text-center">
                    <div className="w-16 h-16 bg-[#d1d119]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#d1d119]/20">
                        <Lock className="w-8 h-8 text-[#d1d119]" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Admin Access</h1>
                    <p className="text-zinc-500 text-sm mt-1">Please enter your 6-digit administrator PIN</p>
                </div>

                {/* PIN Display */}
                <div className="flex gap-3 mb-10">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className={`w-12 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${error
                                ? "border-red-500 bg-red-500/10 text-red-500 animate-shake"
                                : pin.length > i
                                    ? "border-[#d1d119] bg-[#d1d119]/5 text-white"
                                    : "border-zinc-800 bg-zinc-900 text-zinc-600"
                                }`}
                        >
                            {pin.length > i ? "●" : ""}
                        </div>
                    ))}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-4 w-full mb-8">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                        <button
                            key={n}
                            onClick={() => handlePress(n)}
                            disabled={loading || pin.length >= 6}
                            className="h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-2xl font-bold hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {n}
                        </button>
                    ))}
                    <button
                        onClick={handleDelete}
                        disabled={loading || pin.length === 0}
                        className="h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-800 transition-all active:scale-95"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => handlePress("0")}
                        disabled={loading || pin.length >= 6}
                        className="h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-2xl font-bold hover:bg-zinc-800 active:scale-95 disabled:opacity-50"
                    >
                        0
                    </button>
                    <button
                        onClick={handleLogin}
                        disabled={loading || pin.length !== 6}
                        className={`h-16 rounded-2xl border flex items-center justify-center transition-all active:scale-95 ${pin.length === 6
                            ? "bg-[#d1d119] border-[#d1d119] text-black hover:bg-[#b0b012]"
                            : "bg-zinc-900 border-zinc-800 text-zinc-600"
                            }`}
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-7 h-7" />}
                    </button>
                </div>

                {error && (
                    <div className="text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                        Invalid administrator PIN. Access denied.
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out 0s 2;
                }
            `}</style>
        </div>
    );
}
