"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Participant {
    id: string;
    name: string;
    scores: Record<string, number>;
}

export interface ScoreColumn {
    id: string;
    name: string;
}

export interface ScoreboardData {
    participants: Participant[];
    columns: ScoreColumn[];
    logo?: string;
}

export interface Scoreboard {
    id: string;
    title: string;
    data: ScoreboardData;
    pin?: string;
    created_at?: string;
    timer_seconds?: number; // Keeping for potential timer usage
}

export function useScoreboard(id: string | undefined | string[]) {
    const [board, setBoard] = useState<Scoreboard | null>(null);

    useEffect(() => {
        const boardId = Array.isArray(id) ? id[0] : id;
        if (!boardId) return;

        // 1. Fetch initial data
        const fetchBoard = async () => {
            const { data, error } = await supabase
                .from('scoreboards')
                .select('*')
                .eq('id', boardId)
                .single();

            if (data) {
                // Ensure data structure exists and has required arrays
                const rawData = data.data || {};
                const safeData: ScoreboardData = {
                    participants: Array.isArray(rawData.participants) ? rawData.participants : [],
                    columns: Array.isArray(rawData.columns) ? rawData.columns : [],
                    logo: rawData.logo
                };
                setBoard({ ...data, data: safeData });
            }
            if (error) console.error("Error fetching board:", error.message);
        };

        fetchBoard();

        // 2. Subscribe to REALTIME updates
        const channel = supabase
            .channel(`scoreboard-${boardId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'scoreboards',
                    filter: `id=eq.${boardId}`,
                },
                (payload) => {
                    const newData = payload.new as any;

                    setBoard((prev) => {
                        if (!prev) return newData as Scoreboard;

                        // Careful merge: only update data if it is present in the payload
                        // If Supabase sends a partial update (unlikely for 'new' but possible if toast/RLS),
                        // we shouldn't wipe our local data.
                        const incomingData = newData.data;

                        // If incomingData is explicitly null or an object, we process it.
                        // If it is undefined (missing key), we keep previous data.
                        if (incomingData !== undefined) {
                            const rawData = incomingData || {};
                            const safeData: ScoreboardData = {
                                participants: Array.isArray(rawData.participants) ? rawData.participants : [],
                                columns: Array.isArray(rawData.columns) ? rawData.columns : [],
                                logo: rawData.logo
                            };
                            return { ...newData, data: safeData } as Scoreboard;
                        } else {
                            // 'data' not in payload, keep existing data but update other fields (title, etc)
                            return { ...newData, data: prev.data } as Scoreboard;
                        }
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    return board;
}