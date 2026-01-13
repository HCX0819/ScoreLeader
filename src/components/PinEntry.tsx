"use client";

import { useState } from "react";
import { Lock, ArrowRight, Loader2 } from "lucide-react";

interface PinEntryProps {
    onUnlock: (pin: string) => Promise<boolean> | boolean;
}

export default function PinEntry({ onUnlock }: PinEntryProps) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin) return;

        setLoading(true);
        setError(false);

        try {
            const success = await onUnlock(pin);
            if (!success) {
                setError(true);
                setPin("");
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
            {/* Background Glow */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_10%,_rgba(120,40,200,0.15),_transparent_50%)] pointer-events-none" />

            <div className="relative z-10 bg-white/5 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/10 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                    <Lock className="text-violet-400" size={32} />
                </div>

                <h2 className="text-3xl font-black tracking-tight text-white mb-2">Restricted Access</h2>
                <p className="text-white/40 font-medium mb-8">This board is protected. Please enter the PIN to continue.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value);
                                setError(false);
                            }}
                            placeholder="PIN Code"
                            className={`w-full px-4 py-4 rounded-xl bg-black/20 border-2 outline-none transition-all text-center text-2xl tracking-[0.5em] font-mono text-white placeholder-white/10
                                ${error
                                    ? "border-red-500/50 focus:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                    : "border-white/5 focus:border-violet-500/50 focus:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                                }`}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm font-bold animate-pulse">
                            Incorrect PIN. Please try again.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !pin}
                        className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>Unlock Board <ArrowRight size={18} strokeWidth={3} /></>}
                    </button>
                </form>
            </div>
        </div>
    );
}
