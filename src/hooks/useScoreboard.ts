"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface SubGame {
    id: string;
    name: string;
    scores: Record<string, number>; // participantId -> value
}

export interface Activity {
    id: string;
    name: string;
    subGames: SubGame[];
    directScores: Record<string, number>; // participantId -> value (used if subGames is empty)
}

export interface Participant {
    id: string;
    name: string;
}

export interface ScoreboardData {
    participants: Participant[];
    activities: Activity[];
    logo?: string;
    backgroundColor?: string;
}

export interface Scoreboard {
    id: string;
    title: string;
    data: ScoreboardData;
    pin?: string;
    background_color?: string;
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
                // Ensure data structure exists and handle migration
                const rawData = data.data || {};
                const safeData: ScoreboardData = {
                    participants: Array.isArray(rawData.participants) ? rawData.participants : [],
                    activities: Array.isArray(rawData.activities) ? rawData.activities : [],
                    logo: rawData.logo,
                    backgroundColor: rawData.backgroundColor || data.background_color
                };

                // MIGRATION: If we have old 'columns', convert them to activities
                if (Array.isArray(rawData.columns) && safeData.activities.length === 0) {
                    safeData.activities = rawData.columns.map((col: any) => ({
                        id: col.id,
                        name: col.name,
                        subGames: [],
                        directScores: {}
                    }));

                    // Move existing participant scores into directScores
                    safeData.participants.forEach((p: any) => {
                        if (p.scores) {
                            Object.entries(p.scores).forEach(([colId, val]) => {
                                const activity = safeData.activities.find(a => a.id === colId);
                                if (activity) {
                                    activity.directScores[p.id] = val as number;
                                }
                            });
                        }
                    });
                }

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
                                activities: Array.isArray(rawData.activities) ? rawData.activities : [],
                                logo: rawData.logo,
                                backgroundColor: rawData.backgroundColor || newData.background_color
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