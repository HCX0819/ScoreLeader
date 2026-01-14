"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Plus, Layout, MoreHorizontal, Loader2, Edit2, Image as ImageIcon, X, Trash2 } from 'lucide-react';
import { compressImage } from "@/lib/image-compression";

interface BoardSummary {
  id: string;
  title: string;
  created_at: string;
  data?: { logo?: string };
}

export default function Dashboard() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Edit Modal State
  const [editingBoard, setEditingBoard] = useState<BoardSummary | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLogo, setEditLogo] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    const { data, error } = await supabase
      .from('scoreboards')
      .select('id, title, created_at, data')
      .order('created_at', { ascending: false });

    if (data) setBoards(data);
    setLoading(false);
  };

  const createNewBoard = async () => {
    setCreating(true);
    // Initialize with a default structure
    const defaultData = {
      participants: [
        { id: crypto.randomUUID(), name: 'Team A' },
        { id: crypto.randomUUID(), name: 'Team B' }
      ],
      activities: [
        { id: crypto.randomUUID(), name: 'ROUND 1', subGames: [], directScores: {} }
      ]
    };

    const { data, error } = await supabase
      .from('scoreboards')
      .insert([
        {
          title: 'Board (no title)',
          data: defaultData,
          // Legacy fields - keeping them to satisfy potential NOT NULL constraints
          home_name: 'New Board',
          away_name: '-',
          home_score: 0,
          away_score: 0,
          timer_seconds: 0
        }
      ])
      .select()
      .single();

    if (data) {
      router.push(`/control/${data.id}`);
    } else {
      setCreating(false);
      console.error("Full Error:", error);
      alert(`Error creating board: ${error?.message || JSON.stringify(error)}\n\nHint: Check internal console for more details.`);
    }
  };

  const deleteBoard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this scoreboard?")) return;

    const { error } = await supabase.from('scoreboards').delete().eq('id', id);
    if (error) {
      alert("Failed to delete board");
      console.error(error);
    } else {
      setBoards(boards.filter(b => b.id !== id));
      setMenuOpenId(null);
    }
  };

  const handleUpdateBoard = async () => {
    if (!editingBoard) return;
    setIsUpdating(true);

    try {
      // Fetch current data to preserve other fields
      const { data: currentBoard } = await supabase
        .from('scoreboards')
        .select('data')
        .eq('id', editingBoard.id)
        .single();

      const updatedData = {
        ...(currentBoard?.data || {}),
        logo: editLogo
      };

      const { error } = await supabase
        .from('scoreboards')
        .update({
          title: editTitle,
          data: updatedData
        })
        .eq('id', editingBoard.id);

      if (error) throw error;

      // Update local state
      setBoards(boards.map(b => b.id === editingBoard.id ? { ...b, title: editTitle, data: updatedData } : b));
      setEditingBoard(null);
    } catch (error) {
      console.error("Error updating board:", error);
      alert("Failed to update board info");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImage(file);
      setEditLogo(base64);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to process image");
    }
  };

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'recently';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} days ago`;
    return 'a long time ago';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-violet-500/30 font-sans" onClick={() => setMenuOpenId(null)}>

      {/* Background Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_10%,_rgba(120,40,200,0.15),_transparent_50%)] pointer-events-none" />

      {/* Top Navigation */}
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 px-4 sm:px-8 py-4 sm:py-6 flex justify-between items-center border-b border-white/5 bg-[#050505] shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-end justify-center pb-1.5 gap-[2px] shadow-[0_0_15px_rgba(250,204,21,0.3)]">
            <div className="w-[3px] h-2.5 bg-black/40 rounded-t-sm" />
            <div className="w-[3px] h-4 bg-black/40 rounded-t-sm" />
            <div className="w-[3px] h-1.5 bg-black/40 rounded-t-sm" />
          </div>
          <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            ScoreTag
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
          <span className="cursor-pointer hover:text-white transition-colors">My boards</span>
          <span className="cursor-pointer hover:text-white transition-colors">Solution</span>
          <span className="cursor-pointer hover:text-white transition-colors">Feedback</span>
          <span className="cursor-pointer hover:text-white transition-colors">Contact</span>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              My Boards
            </h1>
            <p className="text-white/40 font-medium">Manage and monitor your live games</p>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); createNewBoard(); }}
            disabled={creating}
            className="group relative px-4 sm:px-6 py-2.5 sm:py-3 bg-violet-600 rounded-full font-bold text-sm text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-2">
              {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
              <span>Create Board</span>
            </div>
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-white/5 rounded-2xl border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {boards.map((board) => (
              <div
                key={board.id}
                onClick={() => router.push(`/control/${board.id}`)}
                className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 p-6 rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-md shadow-lg hover:shadow-2xl hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-6">
                  {/* Logo Thumbnail */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-110 transition-transform duration-300">
                    {board.data?.logo ? (
                      <img src={board.data.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Layout size={24} className="text-white/20" />
                    )}
                  </div>

                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === board.id ? null : board.id)}
                      className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                      <MoreHorizontal size={20} />
                    </button>

                    {/* Dropdown Menu */}
                    {menuOpenId === board.id && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a0a0a] rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-white/10 z-20 py-1 overflow-hidden backdrop-blur-xl">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBoard(board);
                            setEditTitle(board.title || "");
                            setEditLogo(board.data?.logo || "");
                            setMenuOpenId(null);
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                        >
                          <Edit2 size={14} />
                          Edit Board Info
                        </button>
                        <div className="h-[1px] bg-white/5 mx-2" />
                        <button
                          onClick={(e) => deleteBoard(board.id, e)}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2"
                        >
                          <Trash2 size={14} />
                          Delete Board
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-violet-400 transition-colors truncate">
                    {board.title || 'Untitled Board'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/30 uppercase">
                    <span>Created: {getTimeAgo(board.created_at)}</span>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -bottom-1 -right-1 w-20 h-20 bg-violet-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              </div>
            ))}
          </div>
        )}

        {!loading && boards.length === 0 && (
          <div className="col-span-full py-32 rounded-3xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Layout size={40} className="text-white/20" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No boards yet</h3>
            <p className="text-white/40 max-w-sm mx-auto mb-8">Create your first scoreboard to start tracking your games in real-time.</p>
            <button
              onClick={createNewBoard}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-semibold transition-colors border border-white/5"
            >
              Create Now
            </button>
          </div>
        )}

      </main>
      {/* Edit Board Modal */}
      {editingBoard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingBoard(null)} />

          <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-white italic">Edit Board Info</h2>
              <button
                onClick={() => setEditingBoard(null)}
                className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Title Input */}
              <div>
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Board Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter board title..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/10 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Board Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {editLogo ? (
                      <img src={editLogo} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="text-white/10" size={32} />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="block">
                      <span className="sr-only">Choose logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="block w-full text-sm text-white/40
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-xs file:font-bold
                          file:bg-violet-600 file:text-white
                          hover:file:bg-violet-700
                          cursor-pointer"
                      />
                    </label>
                    <button
                      onClick={() => setEditLogo("")}
                      className="text-[10px] font-bold text-red-400/50 hover:text-red-400 transition-colors uppercase tracking-widest"
                    >
                      Remove Logo
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleUpdateBoard}
                  disabled={isUpdating}
                  className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-white italic tracking-wider shadow-[0_10px_30px_rgba(139,92,246,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  {isUpdating ? <Loader2 className="animate-spin" size={20} /> : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}