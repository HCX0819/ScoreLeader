"use client";

import { useParams } from "next/navigation";
import { useScoreboard, Participant } from "@/hooks/useScoreboard";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Activity, Loader2 } from 'lucide-react';

export default function ViewBoardPage() {
    const params = useParams();
    const rawId = params?.id;
    const boardId = Array.isArray(rawId) ? rawId[0] : rawId;
    const board = useScoreboard(boardId);

    if (!boardId) return null;

    if (!board) {
        return (
            <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-violet-500" size={40} />
                <p className="text-white/40 font-mono text-xs uppercase tracking-[0.2em]">Connecting to Live Feed...</p>
            </div>
        );
    }

    const data = board.data || { participants: [], columns: [] };

    // Calculate totals and sort
    const getParticipantTotal = (p: Participant) => Object.values(p.scores).reduce((a, b) => a + b, 0);

    const sortedParticipants = [...data.participants].sort((a, b) => {
        return getParticipantTotal(b) - getParticipantTotal(a);
    });

    return (
        <main className="min-h-screen bg-[#0f172a] text-white overflow-hidden relative">
            {/* Dynamic Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/20 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[150px] rounded-full" />
            </div>

            {/* Header */}
            <header className="relative z-10 px-8 py-8 flex justify-between items-end border-b border-white/5 bg-black/20 backdrop-blur-sm">
                <div className="flex items-center gap-6">
                    {/* Logo Display */}
                    {data.logo && (
                        <div className="w-20 h-20 bg-white/10 rounded-xl flex items-center justify-center p-2 backdrop-blur-sm border border-white/10 shadow-lg">
                            <img src={data.logo} alt="Board Logo" className="w-full h-full object-contain filter drop-shadow hover:scale-105 transition-transform" />
                        </div>
                    )}

                    <div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2">
                            {board.title}
                        </h1>
                        <div className="flex items-center gap-2 text-violet-400 font-mono text-xs tracking-widest uppercase">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                            </span>
                            Live Leaderboard
                        </div>
                    </div>
                </div>
                <div className="text-right hidden md:block">
                    <div className="text-white/20 font-bold text-5xl tabular-nums tracking-tighter">
                        {sortedParticipants.length}
                    </div>
                    <div className="text-white/40 text-xs font-mono uppercase tracking-widest">Participants</div>
                </div>
            </header>

            {/* Leaderboard Table */}
            <div className="relative z-10 p-6 md:p-12 overflow-x-auto">
                <div className="min-w-[800px] border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02] backdrop-blur-md shadow-2xl">

                    {/* Table Header */}
                    <div className="grid bg-black/40 text-white/40 font-bold text-xs uppercase tracking-widest border-b border-white/5"
                        style={{ gridTemplateColumns: `80px 300px 150px repeat(${data.columns.length}, 1fr)` }}>
                        <div className="p-6 text-center">Rank</div>
                        <div className="p-6">Participant</div>
                        <div className="p-6 text-center text-white/80 bg-white/5">Total</div>
                        {data.columns.map(col => (
                            <div key={col.id} className="p-6 text-center border-l border-white/5">
                                {col.name}
                            </div>
                        ))}
                    </div>

                    {/* Rows */}
                    <div className="relative">
                        <AnimatePresence>
                            {sortedParticipants.map((participant, index) => (
                                <motion.div
                                    key={participant.id}
                                    layoutId={participant.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 50, damping: 20 }}
                                    className={`grid items-center border-b border-white/5 hover:bg-white/[0.03] transition-colors
                        ${index === 0 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent' : ''}
                        ${index === 1 ? 'bg-gradient-to-r from-slate-400/10 to-transparent' : ''}
                        ${index === 2 ? 'bg-gradient-to-r from-orange-700/10 to-transparent' : ''}
                    `}
                                    style={{ gridTemplateColumns: `80px 300px 150px repeat(${data.columns.length}, 1fr)` }}
                                >

                                    {/* Rank */}
                                    <div className="p-6 text-center font-black text-2xl text-white/20 font-mono">
                                        {index + 1}
                                        {index === 0 && <Trophy className="inline-block ml-2 text-yellow-500 mb-1" size={16} />}
                                    </div>

                                    {/* Name */}
                                    <div className="p-6">
                                        <h3 className={`font-bold text-lg tracking-tight ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>
                                            {participant.name}
                                        </h3>
                                    </div>

                                    {/* Total Score */}
                                    <div className="p-6 text-center font-black text-3xl tabular-nums text-white bg-white/5 h-full flex items-center justify-center border-l border-r border-white/5 shadow-inner">
                                        {getParticipantTotal(participant)}
                                    </div>

                                    {/* Column Scores */}
                                    {data.columns.map(col => (
                                        <div key={col.id} className="p-6 text-center text-xl font-medium text-white/60 tabular-nums border-l border-white/5">
                                            {participant.scores[col.id] || 0}
                                        </div>
                                    ))}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                </div>
            </div>

        </main>
    );
}