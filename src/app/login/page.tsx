"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyStaffPin, StaffMember } from "@/lib/staffService";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleNumberClick = (num: number) => {
        if (pin.length < 4) {
            setPin((prev) => prev + num);
            setError("");
        }
    };

    const handleClear = () => {
        setPin("");
        setError("");
    };

    const handleDelete = () => {
        setPin((prev) => prev.slice(0, -1));
        setError("");
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length !== 4) {
            setError("Please enter a 4-digit PIN.");
            return;
        }

        setLoading(true);
        try {
            const staff: StaffMember | null = await verifyStaffPin(pin);
            if (!staff) {
                setError("Invalid PIN. Please try again.");
                setPin("");
                return;
            }
            // Store staff in session storage so dashboard can read it
            sessionStorage.setItem("rtw_staff", JSON.stringify(staff));
            router.push("/dashboard");
        } catch {
            setError("Connection error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-[#d1d119] tracking-tight">
                        Roti Naan Wala
                    </h1>
                    <p className="text-zinc-400 mt-2 text-lg">Staff Terminal</p>
                </div>

                <Card className="bg-zinc-900 border-zinc-800 shadow-2xl">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-2xl text-white">Enter Your PIN</CardTitle>
                        <CardDescription className="text-zinc-400">
                            Please enter your 4-digit access code
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-6">
                            {/* PIN Display */}
                            <div className="flex justify-center gap-4 my-6">
                                {[0, 1, 2, 3].map((index) => (
                                    <div
                                        key={index}
                                        className={`w-14 h-16 rounded-xl flex items-center justify-center text-3xl font-bold transition-all ${pin[index]
                                                ? "bg-[#d1d119] text-black shadow-[0_0_15px_rgba(209,209,25,0.4)]"
                                                : "bg-zinc-800 text-zinc-600 border border-zinc-700"
                                            }`}
                                    >
                                        {pin[index] ? "●" : ""}
                                    </div>
                                ))}
                            </div>

                            {error && (
                                <p className="text-red-400 text-center text-sm font-medium bg-red-400/10 py-2 px-4 rounded-lg">
                                    {error}
                                </p>
                            )}

                            {/* Number Pad */}
                            <div className="grid grid-cols-3 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <Button
                                        key={num}
                                        type="button"
                                        variant="outline"
                                        className="h-16 text-2xl font-semibold bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:text-[#d1d119] transition-colors"
                                        onClick={() => handleNumberClick(num)}
                                    >
                                        {num}
                                    </Button>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-16 text-base font-semibold bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                                    onClick={handleClear}
                                >
                                    Clear
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-16 text-2xl font-semibold bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 hover:text-[#d1d119] transition-colors"
                                    onClick={() => handleNumberClick(0)}
                                >
                                    0
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-16 text-xl font-semibold bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                                    onClick={handleDelete}
                                >
                                    ⌫
                                </Button>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading || pin.length !== 4}
                                className="w-full h-14 text-lg font-bold bg-[#d1d119] text-black hover:bg-[#b0b012] transition-colors mt-4 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
