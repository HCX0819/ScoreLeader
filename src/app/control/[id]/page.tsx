"use client";

import { useParams } from "next/navigation";
import { useScoreboard, ScoreboardData } from "@/hooks/useScoreboard";
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useRef } from "react";
import {
  Plus, Trash2, UserPlus, Columns, ChevronLeft,
  Settings, Share2, ArrowLeft, Upload, Image as ImageIcon,
  Edit3, Lock, Check, Copy, ExternalLink, Activity, Info
} from 'lucide-react';
import Link from "next/link";
import { compressImage } from "@/lib/image-compression";
import PinEntry from "@/components/PinEntry";

export default function ControllerPage() {
  const { id } = useParams();
  const boardId = Array.isArray(id) ? id[0] : id;
  const board = useScoreboard(boardId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PIN & Settings State
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [copied, setCopied] = useState(false);

  // Authentication Check
  useEffect(() => {
    if (!board) return;

    // If no PIN is set, allow access
    if (!board.pin) {
      setIsAuthorized(true);
      return;
    }

    // Check session storage for auth
    const storedAuth = sessionStorage.getItem(`board_auth_${boardId}`);
    if (storedAuth === board.pin) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
  }, [board, boardId]);

  // Loading States
  if (!boardId) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/50">Initializing...</div>;
  if (!board) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/50">Loading Board...</div>;

  // Render PIN Entry if locked
  if (!isAuthorized && board.pin) {
    return <PinEntry onUnlock={(pin) => {
      if (pin === board.pin) {
        sessionStorage.setItem(`board_auth_${boardId}`, pin);
        setIsAuthorized(true);
        return true;
      }
      return false;
    }} />;
  }

  const data = board.data || { participants: [], activities: [] };

  // --- Actions ---

  const updateBoardData = async (newData: ScoreboardData) => {
    const { error } = await supabase
      .from('scoreboards')
      .update({ data: newData })
      .eq('id', boardId);

    if (error) console.error("Update failed:", error.message);
  };

  const updateTitle = async (newTitle: string) => {
    const { error } = await supabase
      .from('scoreboards')
      .update({ title: newTitle })
      .eq('id', boardId);

    if (error) console.error("Title update failed:", error.message);
    setEditingTitle(false);
  };

  const updatePin = async () => {
    const { error } = await supabase
      .from('scoreboards')
      .update({ pin: newPin || null }) // Empty string removes PIN
      .eq('id', boardId);

    if (error) {
      alert("Failed to update PIN");
    } else {
      setShowSettings(false);
      setNewPin("");
      if (newPin) {
        sessionStorage.setItem(`board_auth_${boardId}`, newPin);
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImage(file);
      const newData = { ...data, logo: compressedBase64 };
      await updateBoardData(newData);
    } catch (err) {
      console.error("Image upload failed", err);
      alert("Failed to process image.");
    }
  };

  const updateBackgroundColor = async (color: string) => {
    const newData = { ...data, backgroundColor: color };
    await updateBoardData(newData);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ... (Existing updateScore, addParticipant, addColumn, updateName, deleteItem, calculateTotal logic - kept same)
  // --- Helper Calculations ---
  const getActivityTotal = (activityId: string, participantId: string) => {
    const activity = data.activities.find(a => a.id === activityId);
    if (!activity) return 0;

    if (activity.subGames.length === 0) {
      return activity.directScores[participantId] || 0;
    }

    return activity.subGames.reduce((sum, game) => sum + (game.scores[participantId] || 0), 0);
  };

  const getGrandTotal = (participantId: string) => {
    return data.activities.reduce((sum, activity) => sum + getActivityTotal(activity.id, participantId), 0);
  };

  // --- Actions ---

  const updateActivityScore = async (activityId: string, participantId: string, delta: number) => {
    const newData = { ...data };
    const activity = newData.activities.find(a => a.id === activityId);
    if (!activity || activity.subGames.length > 0) return; // Only direct if no subgames
    const current = activity.directScores[participantId] || 0;
    activity.directScores[participantId] = Math.max(0, current + delta);
    await updateBoardData(newData);
  };

  const setActivityScore = async (activityId: string, participantId: string, value: string) => {
    const newData = { ...data };
    const activity = newData.activities.find(a => a.id === activityId);
    if (!activity || activity.subGames.length > 0) return;
    const numValue = parseInt(value) || 0;
    activity.directScores[participantId] = Math.max(0, numValue);
    await updateBoardData(newData);
    setEditingId(null);
  };

  const updateSubGameScore = async (activityId: string, subGameId: string, participantId: string, delta: number) => {
    const newData = { ...data };
    const activity = newData.activities.find(a => a.id === activityId);
    const subGame = activity?.subGames.find(g => g.id === subGameId);
    if (!subGame) return;
    const current = subGame.scores[participantId] || 0;
    subGame.scores[participantId] = Math.max(0, current + delta);
    await updateBoardData(newData);
  };

  const setSubGameScore = async (activityId: string, subGameId: string, participantId: string, value: string) => {
    const newData = { ...data };
    const activity = newData.activities.find(a => a.id === activityId);
    const subGame = activity?.subGames.find(g => g.id === subGameId);
    if (!subGame) return;
    const numValue = parseInt(value) || 0;
    subGame.scores[participantId] = Math.max(0, numValue);
    await updateBoardData(newData);
    setEditingId(null);
  };

  const addParticipant = async () => {
    const newData = { ...data };
    newData.participants.push({
      id: crypto.randomUUID(),
      name: `Team ${String.fromCharCode(65 + newData.participants.length)}`,
    });
    await updateBoardData(newData);
  };

  const addActivity = async () => {
    const newData = { ...data };
    newData.activities.push({
      id: crypto.randomUUID(),
      name: `ROUND ${newData.activities.length + 1}`,
      subGames: [],
      directScores: {}
    });
    await updateBoardData(newData);
  };

  const addSubGame = async (activityId: string) => {
    const newData = { ...data };
    const activity = newData.activities.find(a => a.id === activityId);
    if (!activity) return;
    activity.subGames.push({
      id: crypto.randomUUID(),
      name: `Game ${activity.subGames.length + 1}`,
      scores: {}
    });
    await updateBoardData(newData);
  };

  const updateName = async (type: 'participant' | 'activity' | 'subgame', id: string, newName: string, activityId?: string) => {
    // Use deep copy to avoid mutating original state
    const newData = JSON.parse(JSON.stringify(data));
    if (type === 'participant') {
      const p = newData.participants.find((x: { id: string }) => x.id === id);
      if (p) p.name = newName;
    } else if (type === 'activity') {
      const a = newData.activities.find((x: { id: string }) => x.id === id);
      if (a) a.name = newName;
    } else if (type === 'subgame' && activityId) {
      const a = newData.activities.find((x: { id: string }) => x.id === activityId);
      const g = a?.subGames.find((x: { id: string }) => x.id === id);
      if (g) g.name = newName;
    }
    setEditingId(null);
    await updateBoardData(newData);
  };

  const deleteItem = async (type: 'participant' | 'activity' | 'subgame', id: string, activityId?: string) => {
    if (!confirm("Are you sure?")) return;
    const newData = { ...data };
    if (type === 'participant') {
      newData.participants = newData.participants.filter(x => x.id !== id);
    } else if (type === 'activity') {
      newData.activities = newData.activities.filter(x => x.id !== id);
    } else if (type === 'subgame' && activityId) {
      const a = newData.activities.find(x => x.id === activityId);
      if (a) a.subGames = a.subGames.filter(x => x.id !== id);
    }
    await updateBoardData(newData);
  };

  return (
    <div
      className="h-screen text-white font-sans selection:bg-violet-500/30 overflow-hidden flex flex-col transition-colors duration-200"
      style={{ backgroundColor: data.backgroundColor || '#0f172a' }}
    >

      {/* Background Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(120,40,200,0.1),_transparent_50%)] pointer-events-none" />

      {/* Header - Adaptive Height */}
      <header className="flex-none px-3 sm:px-6 py-2 sm:py-4 flex flex-col sm:flex-row items-center justify-between border-b border-white/5 bg-white/5 backdrop-blur-xl z-40 relative gap-3 sm:gap-0">
        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
              <ChevronLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              {/* Logo Upload - Slightly smaller on mobile */}
              <div
                className="relative w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer group border border-white/10 hover:border-violet-500/50 transition-colors shadow-inner"
                onClick={() => fileInputRef.current?.click()}
              >
                {data.logo ? (
                  <img src={data.logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="text-white/20 group-hover:text-violet-400 transition-colors" size={18} />
                )}
                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="text-white" size={14} />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleLogoUpload}
                />
              </div>

              {/* Title Editing */}
              <div className="max-w-[150px] sm:max-w-xs">
                {editingTitle ? (
                  <input
                    autoFocus
                    className="font-black text-lg sm:text-2xl tracking-tight text-white outline-none border-b-2 border-violet-500 bg-transparent w-full"
                    defaultValue={board.title}
                    onBlur={(e) => updateTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  />
                ) : (
                  <div className="group flex items-center gap-2 cursor-pointer" onClick={() => setEditingTitle(true)}>
                    <h1 className="font-black text-lg sm:text-2xl tracking-tight text-white hover:text-violet-200 transition-colors truncate">{board.title}</h1>
                    <Edit3 size={14} className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {board.pin && <Lock size={14} className="text-violet-400 shrink-0" />}
                  </div>
                )}
                <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase">ID: {boardId.slice(0, 6)}</p>
              </div>
            </div>
          </div>

          {/* Mobile Edit Indicator */}
          <div className="flex md:hidden items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500"></span>
            </span>
            <span className="text-[8px] font-black uppercase tracking-widest text-violet-300">Editor</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto sm:overflow-visible no-scrollbar pb-1 sm:pb-0">
          <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300/80">Authorized Editor</span>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-full text-xs sm:text-sm font-bold border border-white/5 transition-all whitespace-nowrap"
          >
            <Share2 size={16} /> <span className="sm:inline">Settings</span>
          </button>
          <Link href={`/view/${boardId}`} target="_blank" className="flex-1 sm:flex-none">
            <button className="w-full flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-full text-xs sm:text-sm font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all whitespace-nowrap">
              <ExternalLink size={16} className="sm:hidden" />
              <span>View Page</span>
            </button>
          </Link>
        </div>
      </header >

      {/* Settings Modal */}
      {
        showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/5 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Share2 size={24} className="text-violet-500" />
                  Share Board
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white transition-colors">
                  <Plus className="rotate-45" size={28} />
                </button>
              </div>

              <div className="space-y-8">
                {/* Link Section */}
                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-3">
                    Board Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={typeof window !== 'undefined' ? window.location.href : ''}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 outline-none focus:border-violet-500/50 transition-colors select-all font-mono"
                    />
                    <button
                      onClick={copyLink}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border border-transparent
                                ${copied ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/10 text-white hover:bg-white/20 border-white/5"}`}
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-3">
                    Background Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {/* Popular Deep Palette */}
                    {[
                      '#0f172a', // Slate Navy (Very Popular)
                      '#0a0a0a', // Deep Black 
                      '#1e1b4b', // Indigo Night
                      '#1e293b', // Cool Slate
                      '#064e3b', // Deep Emerald
                      '#450a0a', // Rich Maroon
                      '#164e63', // Deep Cyan
                      '#312e81', // Royal Blue
                    ].map(color => (
                      <button
                        key={color}
                        onClick={() => updateBackgroundColor(color)}
                        className={`w-10 h-10 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 ${data.backgroundColor === color ? 'border-white ring-2 ring-white/20' : 'border-white/5'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <div className="relative group">
                      <input
                        type="color"
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 cursor-pointer overflow-hidden opacity-0 absolute inset-0 z-10"
                        onChange={(e) => updateBackgroundColor(e.target.value)}
                      />
                      <div className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center bg-gradient-to-br from-white/10 to-transparent group-hover:bg-white/20 transition-colors">
                        <Plus size={18} className="text-white/40" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Main Content Area - Flex Grow to Fill Screen */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-12 scroll-smooth">

        {/* Mobile Quick Jump / Navigation Bar */}
        {data.activities.length > 1 && (
          <div className="md:hidden sticky top-0 z-30 flex items-center gap-2 overflow-x-auto no-scrollbar py-3 px-4 bg-black/60 backdrop-blur-md border-b border-white/5">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] whitespace-nowrap mr-2">Jump To:</span>
            {data.activities.map((act) => (
              <a
                key={act.id}
                href={`#act-${act.id}`}
                className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-white/60 whitespace-nowrap active:bg-violet-600 active:text-white transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`act-${act.id}`)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {act.name}
              </a>
            ))}
          </div>
        )}

        {/* SUMMARY TABLE SECTION */}
        <div className="flex flex-col items-center">
          <div className="w-full max-w-7xl">
            <h2 className="text-[10px] sm:text-sm font-black text-white/30 uppercase tracking-[0.3em] mb-4 sm:mb-6 px-4">Scoresheet Summary</h2>
            <div className="bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 shadow-2xl overflow-x-auto relative no-scrollbar">
              <div className="min-w-max">
                {/* Header */}
                <div className="grid border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-30"
                  style={{ gridTemplateColumns: `minmax(160px, 240px) 100px repeat(${data.activities.length}, minmax(140px, 1fr)) 70px` }}>

                  {/* Sticky Team Header */}
                  <div className="p-4 sm:p-5 font-bold text-white/40 text-[10px] sm:text-xs uppercase tracking-widest sticky left-0 bg-white/5 backdrop-blur-md z-40 border-r border-white/10">
                    Teams
                  </div>

                  {/* Sticky Total Header */}
                  <div className="p-4 sm:p-5 font-black text-violet-400 text-[10px] sm:text-xs uppercase tracking-widest text-center border-l border-white/5 bg-violet-500/10 backdrop-blur-md sticky left-[160px] sm:left-[240px] z-40 border-r border-white/10">
                    Total
                  </div>

                  {data.activities.map(act => (
                    <div key={act.id} className="p-3 sm:p-4 border-l border-white/5 relative group flex items-center justify-center">
                      {editingId === act.id ? (
                        <input
                          autoFocus
                          className="w-full bg-black/40 border border-violet-500/50 rounded px-2 py-1 text-xs sm:text-sm font-bold text-center text-white outline-none"
                          defaultValue={act.name}
                          onBlur={(e) => updateName('activity', act.id, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                      ) : (
                        <div onClick={() => setEditingId(act.id)} className="text-center cursor-pointer hover:bg-white/5 rounded py-1 px-2 w-full truncate">
                          <span className="text-[10px] sm:text-xs font-bold text-white/60 uppercase tracking-wider block">{act.name}</span>
                        </div>
                      )}
                      <button onClick={() => deleteItem('activity', act.id)} className="absolute top-1 right-1 p-1 text-white/20 hover:text-red-400 transition-colors">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  <div className="p-2 flex items-center justify-center border-l border-white/5 bg-white/5 backdrop-blur-md">
                    <button onClick={addActivity} className="p-2 hover:bg-white/10 text-violet-400 rounded-lg transition-colors" title="Add Activity">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                {data.participants.map(p => (
                  <div key={p.id} className="grid border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    style={{ gridTemplateColumns: `minmax(160px, 240px) 100px repeat(${data.activities.length}, minmax(140px, 1fr)) 70px` }}>

                    {/* Sticky Team Name */}
                    <div className="p-3 sm:p-5 flex items-center gap-3 sm:gap-4 sticky left-0 bg-white/10 backdrop-blur-xl z-30 border-r border-white/10 shadow-lg">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black text-white/40 shrink-0">{p.name.charAt(0)}</div>
                      {editingId === p.id ? (
                        <input autoFocus className="flex-1 bg-black/40 border border-violet-500/50 rounded px-2 py-1 text-xs sm:text-sm font-bold text-white outline-none"
                          defaultValue={p.name} onBlur={(e) => updateName('participant', p.id, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                      ) : (
                        <span onClick={() => setEditingId(p.id)} className="text-sm font-bold text-white/80 cursor-pointer truncate">{p.name}</span>
                      )}
                    </div>

                    {/* Sticky Total Value */}
                    <div className="p-3 sm:p-5 flex items-center justify-center bg-violet-500/5 backdrop-blur-md sticky left-[160px] sm:left-[240px] z-30 border-r border-white/10 shadow-lg">
                      <span className="text-xl sm:text-2xl font-black text-white">{getGrandTotal(p.id)}</span>
                    </div>

                    {data.activities.map(act => (
                      <div key={act.id} className="p-2 sm:p-3 border-l border-white/5 flex items-center justify-center">
                        {act.subGames.length > 0 ? (
                          <span className="text-base sm:text-lg font-bold text-violet-400/50">{getActivityTotal(act.id, p.id)}</span>
                        ) : (
                          <div className="flex items-center gap-1 sm:gap-2 bg-white/5 backdrop-blur-sm rounded-lg p-1 border border-white/5">
                            <button onClick={() => updateActivityScore(act.id, p.id, -1)} className="w-7 h-7 sm:w-8 sm:h-8 hover:bg-white/10 rounded-md text-white/30 text-[10px] flex items-center justify-center font-black">-</button>
                            {editingId === `score-${p.id}-${act.id}` ? (
                              <input type="number" autoFocus className="w-10 sm:w-12 bg-white/10 text-center font-bold text-white outline-none rounded text-sm"
                                defaultValue={act.directScores[p.id] || 0}
                                onBlur={(e) => setActivityScore(act.id, p.id, e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                            ) : (
                              <span onDoubleClick={() => setEditingId(`score-${p.id}-${act.id}`)} className="w-10 sm:w-12 text-center font-black text-white cursor-text text-sm">{act.directScores[p.id] || 0}</span>
                            )}
                            <button onClick={() => updateActivityScore(act.id, p.id, 1)} className="w-7 h-7 sm:w-8 sm:h-8 hover:bg-white/10 rounded-md text-white/30 text-[10px] flex items-center justify-center font-black">+</button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="p-2 flex items-center justify-center border-l border-white/5 bg-white/5">
                      <button onClick={() => deleteItem('participant', p.id)} className="p-2 text-white/20 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Participant Row */}
                <div className="p-3 sm:p-4 border-t border-white/5 bg-white/[0.02]">
                  <button onClick={addParticipant} className="w-full py-3 sm:py-4 border border-dashed border-white/10 rounded-lg sm:rounded-xl text-white/30 font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest">
                    <UserPlus size={14} /> Add Team
                  </button>
                </div>
              </div>
            </div>
            <p className="md:hidden text-[9px] text-white/20 mt-3 flex items-center gap-1.5 px-2">
              <Info size={10} /> Swipe horizontal to see all rounds
            </p>
          </div>
        </div>

        {/* INDIVIDUAL ACTIVITY SECTIONS */}
        <div className="max-w-7xl mx-auto space-y-16">
          {data.activities.map((act) => (
            <section key={act.id} id={`act-${act.id}`} className="relative pt-8 group scroll-mt-24">
              <div className="flex items-center justify-between mb-8 px-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center font-black shadow-[0_0_20px_rgba(139,92,246,0.5)]">
                    {act.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">{act.name}</h3>
                    <p className="text-xs text-white/30 font-bold uppercase tracking-widest">Breakdown & Details</p>
                  </div>
                </div>
                <button
                  onClick={() => addSubGame(act.id)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-violet-600 border border-white/10 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95 text-white/60 hover:text-white"
                >
                  <Plus size={18} /> Add Sub-Game
                </button>
              </div>

              {act.subGames.length > 0 ? (
                <>
                  {/* Desktop View: Table */}
                  <div className="hidden md:block bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="p-6 text-left text-xs font-black text-white/30 uppercase tracking-[0.2em] w-64 border-r border-white/10">Sub-Game</th>
                            {data.participants.map(p => (
                              <th key={p.id} className="p-6 text-center text-xs font-black text-white/30 uppercase tracking-[0.2em] border-r border-white/10">{p.name}</th>
                            ))}
                            <th className="w-20"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {act.subGames.map((game) => (
                            <tr key={game.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                              <td className="p-6 border-r border-white/10">
                                {editingId === game.id ? (
                                  <input autoFocus className="bg-white/5 border border-violet-500 rounded px-3 py-1.5 text-sm font-bold text-white outline-none w-full"
                                    defaultValue={game.name} onBlur={(e) => updateName('subgame', game.id, e.target.value, act.id)}
                                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                                ) : (
                                  <span onClick={() => setEditingId(game.id)} className="font-bold text-white cursor-pointer hover:text-violet-400">{game.name}</span>
                                )}
                              </td>
                              {data.participants.map(p => (
                                <td key={p.id} className="p-6 border-r border-white/10">
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center justify-between w-32 bg-white/5 rounded-xl p-1.5 border border-white/10">
                                      <button onClick={() => updateSubGameScore(act.id, game.id, p.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-white/40 font-bold transition-colors">-</button>
                                      <input type="number" className="w-12 bg-transparent text-center font-black text-white outline-none"
                                        value={game.scores[p.id] || 0} onChange={(e) => setSubGameScore(act.id, game.id, p.id, e.target.value)} />
                                      <button onClick={() => updateSubGameScore(act.id, game.id, p.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-white/40 font-bold transition-colors">+</button>
                                    </div>
                                    <div className="flex gap-1 w-full justify-center">
                                      <button onClick={() => updateSubGameScore(act.id, game.id, p.id, 10)} className="px-2 py-1 bg-violet-500/10 hover:bg-violet-500/20 text-[10px] rounded font-black text-violet-400 transition-colors">+10</button>
                                      <button onClick={() => updateSubGameScore(act.id, game.id, p.id, 100)} className="px-2 py-1 bg-violet-500/10 hover:bg-violet-500/20 text-[10px] rounded font-black text-violet-400 transition-colors">+100</button>
                                    </div>
                                  </div>
                                </td>
                              ))}
                              <td className="p-4 text-center">
                                <button onClick={() => deleteItem('subgame', game.id, act.id)} className="p-2 text-white/10 hover:text-red-400 transition-colors">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-violet-500/10 border-t border-violet-500/20">
                            <td className="p-6 border-r border-white/10">
                              <span className="font-black text-violet-400 uppercase tracking-widest text-xs">Round Total</span>
                            </td>
                            {data.participants.map(p => (
                              <td key={p.id} className="p-6 text-center border-r border-white/10">
                                <span className="text-2xl font-black text-violet-400">{getActivityTotal(act.id, p.id)}</span>
                              </td>
                            ))}
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Mobile View: Cards */}
                  <div className="md:hidden space-y-4 px-2">
                    {act.subGames.map((game) => (
                      <div key={game.id} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                        <div className="p-4 flex items-center justify-between border-b border-white/5">
                          {editingId === game.id ? (
                            <input autoFocus className="bg-white/5 border border-violet-500 rounded px-3 py-1 text-sm font-bold text-white outline-none max-w-[200px]"
                              defaultValue={game.name} onBlur={(e) => updateName('subgame', game.id, e.target.value, act.id)}
                              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                          ) : (
                            <h4 onClick={() => setEditingId(game.id)} className="font-bold text-white text-base flex items-center gap-2">
                              {game.name} <Edit3 size={12} className="text-white/20" />
                            </h4>
                          )}
                          <button onClick={() => deleteItem('subgame', game.id, act.id)} className="p-2 text-white/20 hover:text-red-400">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="p-4 divide-y divide-white/5">
                          {data.participants.map(p => (
                            <div key={p.id} className="py-4 first:pt-0 last:pb-0">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">{p.name}</span>
                                <span className="text-xl font-black text-white px-3 py-1 bg-violet-500/10 rounded-lg">{game.scores[p.id] || 0}</span>
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                <button onClick={() => updateSubGameScore(act.id, game.id, p.id, -1)}
                                  className="h-12 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center font-bold text-lg border border-white/5">-</button>
                                <button onClick={() => updateSubGameScore(act.id, game.id, p.id, 1)}
                                  className="h-12 bg-violet-600/20 hover:bg-violet-600/40 rounded-xl flex items-center justify-center font-bold text-lg border border-violet-500/20">+</button>
                                <button onClick={() => updateSubGameScore(act.id, game.id, p.id, 10)}
                                  className="h-12 bg-violet-600/20 hover:bg-violet-600/40 rounded-xl flex items-center justify-center font-bold text-xs border border-violet-500/20">+10</button>
                                <button onClick={() => updateSubGameScore(act.id, game.id, p.id, 100)}
                                  className="h-12 bg-violet-600/20 hover:bg-violet-600/40 rounded-xl flex items-center justify-center font-bold text-xs border border-violet-500/20">+100</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-white/[0.02] rounded-3xl border border-dashed border-white/10 p-12 flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                    <Plus className="text-white/20" />
                  </div>
                  <h4 className="text-white font-black mb-1 italic opacity-60">No sub-games in {act.name} yet</h4>
                  <p className="text-white/30 text-xs max-w-xs">You can edit {act.name} scores directly in the main table above, or add a sub-game to break it down.</p>
                </div>
              )}
            </section>
          ))}
          {data.activities.length === 0 && (
            <div className="py-32 flex flex-col items-center text-center">
              <Plus size={48} className="text-white/5 mb-6" />
              <h3 className="text-xl font-bold text-white/40">No activities yet</h3>
              <p className="text-white/20 text-sm mt-2">Add a column to the summary table to create your first activity.</p>
            </div>
          )}
        </div>
      </main >
    </div >
  );
}