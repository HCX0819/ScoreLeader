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

    const data = board.data || { participants: [], activities: [] };

    // --- Helper Calculations ---
    const getActivityTotal = (activityId: string, participantId: string) => {
        const activity = data.activities.find(a => a.id === activityId);
        if (!activity) return 0;
        if (activity.subGames.length === 0) return activity.directScores[participantId] || 0;
        return activity.subGames.reduce((sum, game) => sum + (game.scores[participantId] || 0), 0);
    };

    const getGrandTotal = (participantId: string) => {
        return data.activities.reduce((sum, activity) => sum + getActivityTotal(activity.id, participantId), 0);
    };

    const sortedParticipants = [...data.participants].sort((a, b) => {
        return getGrandTotal(b.id) - getGrandTotal(a.id);
    });

    return (
        <main
            className="min-h-screen text-white overflow-y-auto relative selection:bg-violet-500/30 transition-colors duration-700"
            style={{ backgroundColor: board.background_color || '#050505' }}
        >
            {/* Dynamic Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-600/10 blur-[120px] rounded-full" />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-600/10 blur-[120px] rounded-full" />
            </div>

            {/* Header - Adaptive Padding and Flex */}
            <header className="relative z-10 px-4 sm:px-12 py-6 sm:py-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-6 sm:gap-8 border-b border-white/5 bg-black/40 backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 w-full md:w-auto">
                    {/* Logo Display */}
                    {data.logo && (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/5 rounded-2xl flex items-center justify-center p-3 backdrop-blur-md border border-white/10 shadow-2xl relative group shrink-0">
                            <div className="absolute inset-0 bg-violet-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img src={data.logo} alt="Board Logo" className="w-full h-full object-contain relative z-10" />
                        </div>
                    )}

                    <div className="text-center md:text-left">
                        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white mb-2 sm:mb-3 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                            {board.title}
                        </h1>
                        <div className="flex items-center justify-center md:justify-start gap-3 text-violet-400 font-black text-[10px] sm:text-xs tracking-[0.3em] uppercase">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.8)]"></span>
                            </span>
                            Live Leaderboard
                        </div>
                    </div>
                </div>
                <div className="flex gap-8 sm:gap-12 text-center">
                    <div>
                        <div className="text-white/20 font-black text-3xl sm:text-5xl tabular-nums tracking-tighter leading-none mb-1">
                            {sortedParticipants.length}
                        </div>
                        <div className="text-white/40 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Teams</div>
                    </div>
                    {data.activities.length > 0 && (
                        <div>
                            <div className="text-white/20 font-black text-3xl sm:text-5xl tabular-nums tracking-tighter leading-none mb-1">
                                {data.activities.length}
                            </div>
                            <div className="text-white/40 text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Rounds</div>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content Sections */}
            <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-12 space-y-16 sm:space-y-24 scroll-smooth">

                {/* Mobile Quick Jump */}
                {data.activities.length > 0 && (
                    <div className="md:hidden sticky top-0 z-30 flex items-center gap-2 overflow-x-auto no-scrollbar py-3 px-2 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 mx-[-1rem]">
                        <div className="flex items-center gap-2 px-4 italic">
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest whitespace-nowrap">Rounds:</span>
                            <a href="#summary" className="px-3 py-1 bg-violet-600 rounded-full text-[9px] font-bold text-white whitespace-nowrap">Summary</a>
                            {data.activities.filter(a => a.subGames.length > 0).map(act => (
                                <a key={act.id} href={`#act-${act.id}`} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-bold text-white/60 whitespace-nowrap">{act.name}</a>
                            ))}
                        </div>
                    </div>
                )}

                {/* SUMMARY SECTION */}
                <section id="summary" className="scroll-mt-24">
                    <div className="flex items-center gap-3 mb-6 sm:mb-8 px-2 sm:px-4">
                        <Activity size={18} className="text-violet-500 sm:w-5 sm:h-5" />
                        <h2 className="text-[10px] sm:text-xs font-black text-white/30 uppercase tracking-[0.4em]">Scoresheet Summary</h2>
                    </div>

                    <div className="border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden bg-white/[0.02] backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        <div className="overflow-x-auto no-scrollbar">
                            <div className="min-w-max">
                                {/* Table Header */}
                                <div className="grid bg-black/60 text-white/30 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] border-b border-white/10 sticky top-0 z-30"
                                    style={{ gridTemplateColumns: `70px minmax(160px, 240px) 100px repeat(${data.activities.length}, 140px)` }}>
                                    <div className="p-4 sm:p-6 text-center border-r border-white/10 bg-[#050505] sticky left-0 z-40 shadow-xl">Rank</div>
                                    <div className="p-4 sm:p-6 border-r border-white/10 bg-[#050505] sticky left-[70px] z-40 shadow-xl">Team</div>
                                    <div className="p-4 sm:p-6 text-center text-violet-400 bg-violet-500/10 border-r border-white/10 sticky left-[230px] sm:left-[310px] z-40 shadow-xl">Total</div>
                                    {data.activities.map(act => (
                                        <div key={act.id} className="p-4 sm:p-6 text-center border-l border-white/5 truncate px-2">
                                            {act.name}
                                        </div>
                                    ))}
                                </div>

                                {/* Table Body */}
                                <div className="relative">
                                    <AnimatePresence>
                                        {sortedParticipants.map((p, index) => (
                                            <motion.div
                                                key={p.id}
                                                layoutId={p.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                                className={`grid items-center border-b border-white/5 hover:bg-white/[0.03] transition-colors relative group
                                                    ${index === 0 ? 'bg-gradient-to-r from-yellow-500/[0.08] to-transparent' : ''}
                                                    ${index === 1 ? 'bg-gradient-to-r from-slate-400/[0.08] to-transparent' : ''}
                                                    ${index === 2 ? 'bg-gradient-to-r from-orange-700/[0.08] to-transparent' : ''}
                                                `}
                                                style={{ gridTemplateColumns: `70px minmax(160px, 240px) 100px repeat(${data.activities.length}, 140px)` }}
                                            >
                                                {/* Rank */}
                                                <div className="p-4 sm:p-6 text-center flex items-center justify-center sticky left-0 z-20 bg-[#050505] border-r border-white/10 shadow-xl">
                                                    <span className={`text-xl sm:text-3xl font-black font-mono tracking-tighter
                                                        ${index === 0 ? 'text-yellow-500' :
                                                            index === 1 ? 'text-slate-400' :
                                                                index === 2 ? 'text-orange-600' : 'text-white/10'}
                                                    `}>
                                                        {index + 1}
                                                    </span>
                                                    {index === 0 && <Trophy className="absolute top-1 sm:top-2 right-1 sm:right-2 text-yellow-500/50" size={12} />}
                                                </div>

                                                {/* Team Name */}
                                                <div className="p-4 sm:p-6 sticky left-[70px] z-20 bg-[#050505] border-r border-white/10 shadow-xl">
                                                    <h3 className={`font-black text-sm sm:text-xl tracking-tight transition-colors truncate ${index === 0 ? 'text-yellow-100' : 'text-white/90'}`}>
                                                        {p.name}
                                                    </h3>
                                                </div>

                                                {/* Grand Total */}
                                                <div className="p-4 sm:p-6 text-center bg-violet-500/[0.08] h-full flex items-center justify-center border-r border-white/10 sticky left-[230px] sm:left-[310px] z-20 shadow-xl">
                                                    <span className="text-xl sm:text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                                                        {getGrandTotal(p.id)}
                                                    </span>
                                                </div>

                                                {/* Activity Scores */}
                                                {data.activities.map(act => (
                                                    <div key={act.id} className="p-4 sm:p-6 text-center text-sm sm:text-2xl font-black text-white/50 tabular-nums border-l border-white/5 group-hover:text-white/80 transition-colors">
                                                        {getActivityTotal(act.id, p.id)}
                                                    </div>
                                                ))}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* DETAILED ACTIVITY BREAKDOWNS */}
                {data.activities.filter(a => a.subGames.length > 0).map((act) => (
                    <section key={act.id} id={`act-${act.id}`} className="space-y-6 sm:space-y-8 scroll-mt-24">
                        <div className="flex items-center justify-between px-2 sm:px-4">
                            <div className="flex items-center gap-4 sm:gap-5">
                                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-lg sm:text-2xl font-black shadow-[0_10px_30px_rgba(139,92,246,0.4)]">
                                    {act.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">{act.name}</h2>
                                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Detailed Point Breakdown</p>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-[#0a0a0a]/60 backdrop-blur-md rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/[0.03]">
                                            <th className="p-8 text-left text-[10px] font-black text-white/20 uppercase tracking-[0.3em] w-80">Sub-Game</th>
                                            {data.participants.map(p => (
                                                <th key={p.id} className="p-8 text-center text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                                                    {p.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {act.subGames.map((game, gIdx) => (
                                            <tr key={game.id} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${gIdx % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                                                <td className="p-8">
                                                    <span className="text-lg font-black text-white/60 tracking-tight">{game.name}</span>
                                                </td>
                                                {data.participants.map(p => (
                                                    <td key={p.id} className="p-8 text-center">
                                                        <span className="text-3xl font-black text-white tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                                                            {game.scores[p.id] || 0}
                                                        </span>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-violet-500/5">
                                            <td className="p-8">
                                                <span className="text-xs font-black text-violet-400 uppercase tracking-widest">Activity Total</span>
                                            </td>
                                            {data.participants.map(p => (
                                                <td key={p.id} className="p-8 text-center">
                                                    <span className="text-3xl font-black text-violet-400 tabular-nums">
                                                        {getActivityTotal(act.id, p.id)}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                            {act.subGames.map((game) => (
                                <div key={game.id} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                                    <div className="p-4 bg-white/[0.02] border-b border-white/5 flex justify-between items-center">
                                        <h4 className="font-bold text-white/80">{game.name}</h4>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-3">
                                        {data.participants.map(p => (
                                            <div key={p.id} className="bg-black/20 rounded-xl p-3 border border-white/5 text-center">
                                                <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1 truncate">{p.name}</div>
                                                <div className="text-2xl font-black text-white">{game.scores[p.id] || 0}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {/* Mobile Activity Total Card */}
                            <div className="bg-violet-600/10 rounded-2xl border border-violet-500/20 p-4">
                                <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-widest text-center mb-4">Round Summary</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {data.participants.map(p => (
                                        <div key={p.id} className="flex flex-col items-center">
                                            <span className="text-[8px] font-bold text-white/40 mb-1">{p.name}</span>
                                            <span className="text-xl font-black text-violet-400">{getActivityTotal(act.id, p.id)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                ))}
            </div>

            {/* Footer Attribution */}
            <footer className="relative z-10 py-12 px-6 text-center border-t border-white/5 mt-12 bg-black">
                <p className="text-white/10 text-[10px] font-black uppercase tracking-[0.5em] hover:text-white/30 transition-colors cursor-default">
                    Powered by ScoreTag Live
                </p>
            </footer>
        </main>
    );
}