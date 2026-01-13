"use client";

import { useParams } from "next/navigation";
import { useScoreboard, ScoreboardData } from "@/hooks/useScoreboard";
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useRef } from "react";
import {
  Plus, Share2,
  Trash2, Edit3, UserPlus, Columns,
  ChevronLeft, Upload, Image as ImageIcon,
  Lock, Copy, Check
} from "lucide-react";
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

  const data = board.data || { participants: [], columns: [] };

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

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ... (Existing updateScore, addParticipant, addColumn, updateName, deleteItem, calculateTotal logic - kept same)
  const updateScore = async (participantId: string, columnId: string, delta: number) => {
    const newData = { ...data };
    const participant = newData.participants.find(p => p.id === participantId);
    if (!participant) return;
    const currentScore = participant.scores[columnId] || 0;
    participant.scores[columnId] = Math.max(0, currentScore + delta);
    await updateBoardData(newData);
  };

  const setScore = async (participantId: string, columnId: string, value: string) => {
    const newData = { ...data };
    const participant = newData.participants.find(p => p.id === participantId);
    if (!participant) return;
    const numValue = parseInt(value) || 0;
    participant.scores[columnId] = Math.max(0, numValue);
    await updateBoardData(newData);
    setEditingId(null);
  };

  const addParticipant = async () => {
    const newData = { ...data };
    newData.participants.push({
      id: crypto.randomUUID(),
      name: `Team ${String.fromCharCode(65 + newData.participants.length)}`,
      scores: {}
    });
    await updateBoardData(newData);
  };

  const addColumn = async () => {
    const newData = { ...data };
    newData.columns.push({
      id: crypto.randomUUID(),
      name: `Round ${newData.columns.length + 1}`,
    });
    await updateBoardData(newData);
  };

  const updateName = async (type: 'participant' | 'column', id: string, newName: string) => {
    const newData = { ...data };
    if (type === 'participant') {
      const p = newData.participants.find(x => x.id === id);
      if (p) p.name = newName;
    } else {
      const c = newData.columns.find(x => x.id === id);
      if (c) c.name = newName;
    }
    await updateBoardData(newData);
    setEditingId(null);
  };

  const deleteItem = async (type: 'participant' | 'column', id: string) => {
    if (!confirm("Are you sure?")) return;
    const newData = { ...data };
    if (type === 'participant') {
      newData.participants = newData.participants.filter(x => x.id !== id);
    } else {
      newData.columns = newData.columns.filter(x => x.id !== id);
    }
    await updateBoardData(newData);
  };

  const calculateTotal = (participantId: string) => {
    const p = data.participants.find(x => x.id === participantId);
    if (!p) return 0;
    return Object.values(p.scores).reduce((a, b) => a + b, 0);
  };

  return (
    <div className="h-screen bg-[#050505] text-white font-sans selection:bg-violet-500/30 overflow-hidden flex flex-col">

      {/* Background Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(120,40,200,0.1),_transparent_50%)] pointer-events-none" />

      {/* Header - Fixed Height */}
      <header className="flex-none px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-xl z-40 relative">
        <div className="flex items-center gap-6">
          <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
            <ChevronLeft />
          </Link>
          <div className="flex items-center gap-4">
            {/* Logo Upload */}
            <div
              className="relative w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer group border border-white/10 hover:border-violet-500/50 transition-colors shadow-inner"
              onClick={() => fileInputRef.current?.click()}
            >
              {data.logo ? (
                <img src={data.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="text-white/20 group-hover:text-violet-400 transition-colors" size={20} />
              )}
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="text-white" size={16} />
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
            <div>
              {editingTitle ? (
                <input
                  autoFocus
                  className="font-black text-xl sm:text-2xl tracking-tight text-white outline-none border-b-2 border-violet-500 bg-transparent w-full"
                  defaultValue={board.title}
                  onBlur={(e) => updateTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
              ) : (
                <div className="group flex items-center gap-3 cursor-pointer" onClick={() => setEditingTitle(true)}>
                  <h1 className="font-black text-xl sm:text-2xl tracking-tight text-white hover:text-violet-200 transition-colors">{board.title}</h1>
                  <Edit3 size={16} className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {board.pin && <Lock size={16} className="text-violet-400" title="PIN Protected" />}
                </div>
              )}
              <p className="text-xs text-white/30 font-mono tracking-widest uppercase">ID: {boardId.slice(0, 6)}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-full text-sm font-bold border border-white/5 transition-all hover:scale-105 active:scale-95"
          >
            <Share2 size={18} /> <span className="hidden sm:inline">Share</span>
          </button>
          <Link href={`/view/${boardId}`} target="_blank">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-full text-sm font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all hover:scale-105 active:scale-95">
              View Board
            </button>
          </Link>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0a0a0a] rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/10">
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

              <div className="h-px bg-white/5" />

              {/* PIN Section */}
              <div>
                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-3">
                  Security PIN
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder={board.pin ? "Change PIN" : "Set a PIN"}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 outline-none focus:border-violet-500/50 transition-colors placeholder-white/20"
                  />
                  <button
                    onClick={updatePin}
                    className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2 rounded-xl font-bold transition-colors text-sm shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                  >
                    Save
                  </button>
                </div>
                <p className="text-xs text-white/30 mt-3 leading-relaxed font-medium">
                  {board.pin
                    ? <span className="text-amber-400/80">Currently Locked. Clear input & save to unlock.</span>
                    : "Optional: Set a PIN to restrict editing access."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area - Flex Grow to Fill Screen */}
      <main className="flex-1 overflow-hidden p-3 sm:p-6 flex flex-col items-center">

        {/* Glass Card Container - Max Height but shrinks if content is small */}
        <div className="w-fit max-w-full sm:max-w-[95%] xl:max-w-[98%] max-h-full bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-x-auto flex flex-col">

          {/* Table Header - FIXED at Top of Card */}
          <div className="flex-none grid border-b border-white/5 bg-[#0a0a0a]/95 z-10 shadow-lg min-w-max"
            style={{ gridTemplateColumns: `280px 120px repeat(${data.columns.length}, 180px) 80px` }}>

            <div className="p-5 font-bold text-white/40 text-xs uppercase tracking-widest flex items-center sticky left-0 bg-[#0a0a0a] z-20 border-r border-white/5">
              Participants
            </div>

            <div className="p-5 font-black text-white/80 text-xs uppercase tracking-widest text-center border-l border-white/5 bg-violet-500/20 sticky left-[280px] z-20 border-r border-white/10 shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
              Total
            </div>

            {data.columns.map(col => (
              <div key={col.id} className="p-4 border-l border-white/5 relative group flex items-center justify-center">
                {editingId === col.id ? (
                  <input
                    autoFocus
                    className="w-full bg-black/40 border border-violet-500/50 rounded px-2 py-1 text-sm font-bold text-center text-white outline-none"
                    defaultValue={col.name}
                    onBlur={(e) => updateName('column', col.id, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  />
                ) : (
                  <div
                    onClick={() => setEditingId(col.id)}
                    className="text-center cursor-pointer hover:bg-white/5 rounded py-1 px-3 w-full"
                  >
                    <span className="text-xs font-bold text-white/60 uppercase tracking-wider block truncate">{col.name}</span>
                  </div>
                )}
                <button
                  onClick={() => deleteItem('column', col.id)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1.5 text-white/20 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            <div className="p-2 flex items-center justify-center border-l border-white/5 sticky right-0 bg-[#0a0a0a] z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.5)]">
              <button onClick={addColumn} className="p-2 hover:bg-white/10 text-violet-400 rounded-lg transition-colors" title="Add Column">
                <Columns size={18} />
              </button>
            </div>
          </div>

          {/* Table Body - SCROLLABLE Area */}
          <div className="overflow-y-auto overflow-x-hidden min-h-0 min-w-max">
            {data.participants.map((participant) => (
              <div key={participant.id} className="grid border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                style={{ gridTemplateColumns: `280px 120px repeat(${data.columns.length}, 180px) 80px` }}>

                {/* Participant Name */}
                <div className="p-5 flex items-center gap-4 sticky left-0 bg-[#050505] z-10 border-r border-white/5 group-hover:bg-[#0a0a0a] transition-colors shadow-[4px_0_10px_rgba(0,0,0,0.3)]">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/5 flex items-center justify-center text-sm font-black text-white/60 shadow-inner">
                    {participant.name.charAt(0)}
                  </div>
                  {editingId === participant.id ? (
                    <input
                      autoFocus
                      className="flex-1 bg-black/40 border border-violet-500/50 rounded px-3 py-2 text-sm font-bold text-white outline-none"
                      defaultValue={participant.name}
                      onBlur={(e) => updateName('participant', participant.id, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    />
                  ) : (
                    <span
                      onClick={() => setEditingId(participant.id)}
                      className="flex-1 font-bold text-white/90 text-lg cursor-pointer hover:text-violet-300 transition-colors truncate"
                    >
                      {participant.name}
                    </span>
                  )}
                </div>

                {/* Total Score */}
                <div className="p-5 border-l border-white/5 flex items-center justify-center bg-violet-500/5 sticky left-[280px] z-10 border-r border-white/10 group-hover:bg-violet-500/10 transition-colors shadow-[4px_0_10px_rgba(0,0,0,0.3)]">
                  <span className="text-3xl font-black text-white tracking-tight drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                    {calculateTotal(participant.id)}
                  </span>
                </div>

                {/* Score Columns */}
                {data.columns.map(col => (
                  <div key={col.id} className="p-3 border-l border-white/5 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 w-full max-w-[120px]">
                      <div className="flex items-center justify-between w-full bg-black/20 rounded-xl p-1 border border-white/5">
                        <button
                          onClick={() => updateScore(participant.id, col.id, -10)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors text-xs font-medium"
                        >-10</button>
                        <input
                          type="number"
                          className={`w-16 bg-transparent text-center font-bold text-lg text-white outline-none appearance-none transition-all
                            ${editingId === `score-${participant.id}-${col.id}` ? "bg-white/10 ring-2 ring-violet-500/50 rounded" : ""}`}
                          defaultValue={participant.scores[col.id] || 0}
                          key={`${participant.id}-${col.id}-${participant.scores[col.id]}`}
                          readOnly={editingId !== `score-${participant.id}-${col.id}`}
                          onDoubleClick={() => setEditingId(`score-${participant.id}-${col.id}`)}
                          onBlur={(e) => setScore(participant.id, col.id, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                        <button
                          onClick={() => updateScore(participant.id, col.id, 10)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors text-xs font-medium"
                        >+10</button>
                      </div>
                      <div className="flex gap-1 w-full px-1">
                        <button onClick={() => updateScore(participant.id, col.id, -100)} className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] rounded-lg text-white/30 font-bold transition-colors border border-transparent hover:border-white/5">-100</button>
                        <button onClick={() => updateScore(participant.id, col.id, 100)} className="flex-1 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-[10px] rounded-lg text-violet-300 font-bold transition-colors border border-transparent hover:border-violet-500/20">+100</button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Delete Row */}
                <div className="p-2 flex items-center justify-center border-l border-white/5 sticky right-0 bg-[#050505] z-10 group-hover:bg-[#0a0a0a] transition-colors shadow-[-4px_0_10px_rgba(0,0,0,0.3)]">
                  <button
                    onClick={() => deleteItem('participant', participant.id)}
                    className="p-3 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

              </div>
            ))}

            {/* Add Participant Footer */}
            <div className="p-3 border-t border-white/5 bg-white/5 backdrop-blur-sm">
              <button
                onClick={addParticipant}
                className="w-full py-4 border border-dashed border-white/10 rounded-xl text-white/40 font-bold hover:border-violet-500/50 hover:text-violet-300 hover:bg-violet-500/5 transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
              >
                <UserPlus size={18} /> Add Participant
              </button>
            </div>
            {/* Height Spacer for bottom nav/padding */}
            <div className="h-12"></div>
          </div>

        </div>
      </main>
    </div>
  );
}