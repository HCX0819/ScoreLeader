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
    incrementButtons?: number[]; // Custom increment/decrement values, defaults to [5, 7, 10]
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

type LegacyColumn = { id: string; name: string };
type LegacyParticipant = Participant & { scores?: Record<string, number> };
type ScoreboardRowIncoming = Omit<Scoreboard, "data"> & { data?: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | undefined {
    return typeof v === "string" ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
    return typeof v === "number" ? v : undefined;
}

function parseParticipants(v: unknown): Participant[] {
    if (!Array.isArray(v)) return [];
    return v
        .map((x): Participant | null => {
            if (!isRecord(x)) return null;
            const id = asString(x.id);
            const name = asString(x.name);
            if (!id || !name) return null;
            return { id, name };
        })
        .filter((x): x is Participant => x !== null);
}

function parseSubGames(v: unknown): SubGame[] {
    if (!Array.isArray(v)) return [];
    return v
        .map((x): SubGame | null => {
            if (!isRecord(x)) return null;
            const id = asString(x.id);
            const name = asString(x.name);
            const scoresRaw = x.scores;
            const scores: Record<string, number> = {};
            if (isRecord(scoresRaw)) {
                for (const [k, val] of Object.entries(scoresRaw)) {
                    scores[k] = Number(val) || 0;
                }
            }
            if (!id || !name) return null;
            return { id, name, scores };
        })
        .filter((x): x is SubGame => x !== null);
}

function parseActivities(v: unknown): Activity[] {
    if (!Array.isArray(v)) return [];
    return v
        .map((x): Activity | null => {
            if (!isRecord(x)) return null;
            const id = asString(x.id);
            const name = asString(x.name);
            const subGames = parseSubGames(x.subGames);
            const directScoresRaw = x.directScores;
            const directScores: Record<string, number> = {};
            if (isRecord(directScoresRaw)) {
                for (const [k, val] of Object.entries(directScoresRaw)) {
                    directScores[k] = Number(val) || 0;
                }
            }
            if (!id || !name) return null;
            return { id, name, subGames, directScores };
        })
        .filter((x): x is Activity => x !== null);
}

function parseIncrementButtons(v: unknown): number[] | undefined {
    if (!Array.isArray(v)) return undefined;
    const nums = v.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    return nums.length ? nums : undefined;
}

function buildSafeData(row: ScoreboardRowIncoming): ScoreboardData {
    const rawData = row.data ?? {};
    const raw = isRecord(rawData) ? rawData : {};

    return {
        participants: parseParticipants(raw.participants),
        activities: parseActivities(raw.activities),
        logo: asString(raw.logo),
        backgroundColor: asString(raw.backgroundColor) || asString(row.background_color),
        incrementButtons: parseIncrementButtons(raw.incrementButtons),
    };
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
                const row = data as unknown as ScoreboardRowIncoming;

                // Ensure data structure exists and handle migration
                const safeData: ScoreboardData = buildSafeData(row);

                // MIGRATION: If we have old 'columns', convert them to activities
                const rawData = row.data ?? {};
                const legacyColumns = isRecord(rawData) ? rawData.columns : undefined;
                if (Array.isArray(legacyColumns) && safeData.activities.length === 0) {
                    safeData.activities = (legacyColumns as LegacyColumn[]).map((col) => ({
                        id: col.id,
                        name: col.name,
                        subGames: [],
                        directScores: {}
                    }));

                    // Move existing participant scores into directScores
                    safeData.participants.forEach((p) => {
                        const legacy = p as LegacyParticipant;
                        if (legacy.scores) {
                            Object.entries(legacy.scores).forEach(([colId, val]) => {
                                const activity = safeData.activities.find(a => a.id === colId);
                                if (activity) {
                                    activity.directScores[p.id] = Number(val) || 0;
                                }
                            });
                        }
                    });
                }

                setBoard({
                    id: String(row.id),
                    title: String(row.title ?? ""),
                    pin: asString((row as unknown as Record<string, unknown>).pin),
                    background_color: asString((row as unknown as Record<string, unknown>).background_color),
                    created_at: asString((row as unknown as Record<string, unknown>).created_at),
                    timer_seconds: asNumber((row as unknown as Record<string, unknown>).timer_seconds),
                    data: safeData,
                });
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
                    const newData = payload.new as unknown as ScoreboardRowIncoming;

                    setBoard((prev) => {
                        if (!prev) {
                            const safeData = buildSafeData(newData);
                            return {
                                id: String(newData.id),
                                title: String(newData.title ?? ""),
                                pin: asString((newData as unknown as Record<string, unknown>).pin),
                                background_color: asString((newData as unknown as Record<string, unknown>).background_color),
                                created_at: asString((newData as unknown as Record<string, unknown>).created_at),
                                timer_seconds: asNumber((newData as unknown as Record<string, unknown>).timer_seconds),
                                data: safeData,
                            };
                        }

                        // Careful merge: only update data if it is present in the payload
                        // If Supabase sends a partial update (unlikely for 'new' but possible if toast/RLS),
                        // we shouldn't wipe our local data.
                        const incomingData = newData.data;

                        // If incomingData is explicitly null or an object, we process it.
                        // If it is undefined (missing key), we keep previous data.
                        if (incomingData !== undefined) {
                            const safeData = buildSafeData({ ...newData, data: incomingData });
                            return {
                                id: String(newData.id),
                                title: String(newData.title ?? ""),
                                pin: asString((newData as unknown as Record<string, unknown>).pin),
                                background_color: asString((newData as unknown as Record<string, unknown>).background_color),
                                created_at: asString((newData as unknown as Record<string, unknown>).created_at),
                                timer_seconds: asNumber((newData as unknown as Record<string, unknown>).timer_seconds),
                                data: safeData,
                            };
                        } else {
                            // 'data' not in payload, keep existing data but update other fields (title, etc)
                            return {
                                ...prev,
                                id: String(newData.id ?? prev.id),
                                title: String(newData.title ?? prev.title),
                                pin: asString((newData as unknown as Record<string, unknown>).pin) ?? prev.pin,
                                background_color: asString((newData as unknown as Record<string, unknown>).background_color) ?? prev.background_color,
                                created_at: asString((newData as unknown as Record<string, unknown>).created_at) ?? prev.created_at,
                                timer_seconds: asNumber((newData as unknown as Record<string, unknown>).timer_seconds) ?? prev.timer_seconds,
                                data: prev.data,
                            };
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