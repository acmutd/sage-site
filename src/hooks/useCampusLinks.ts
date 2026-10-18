import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getCampusLinks, type CampusLinkMap } from "@/utils/campusLinks";

/**
 * Room strings already asked about this session (resolved or not), so expanding a card again is free.
 * Rows in a list each call the hook; their asks are collected for a moment and sent as one request.
 */
const known = new Map<string, CampusLinkMap[string] | null>();
const inflight = new Set<string>();
const queued = new Set<string>();
const subscribers = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let askingUser: Parameters<typeof getCampusLinks>[1] = null;

const BATCH_MS = 30;
const CHUNK = 25;

function flush() {
    timer = null;
    const rooms = [...queued];
    queued.clear();
    for (let i = 0; i < rooms.length; i += CHUNK) {
        const chunk = rooms.slice(i, i + CHUNK);
        chunk.forEach(r => inflight.add(r));
        getCampusLinks(chunk, askingUser).then(result => {
            chunk.forEach(r => inflight.delete(r));
            if (!result) return; // not remembered, so a later render asks again
            chunk.forEach(r => known.set(r, result[r] ?? null));
            subscribers.forEach(fn => fn());
        });
    }
}

function request(rooms: string[], user: typeof askingUser) {
    askingUser = user;
    for (const r of rooms) if (!known.has(r) && !inflight.has(r)) queued.add(r);
    if (queued.size > 0 && !timer) timer = setTimeout(flush, BATCH_MS);
}

/**
 * Server-built map links for these room strings (exactly as sent, e.g. "ECSW_3.250").
 * Empty while loading, when signed out, or if the request fails.
 */
export function useCampusLinks(rooms: string[]): CampusLinkMap {
    const { user } = useAuth();
    const uid = user?.uid ?? "";
    const key = useMemo(() => [...new Set(rooms.filter(Boolean))].sort().join(","), [rooms.join("\u0000")]); // eslint-disable-line react-hooks/exhaustive-deps
    const [, bump] = useState(0);

    useEffect(() => {
        const fn = () => bump(n => n + 1);
        subscribers.add(fn);
        return () => { subscribers.delete(fn); };
    }, []);

    useEffect(() => {
        if (uid && key) request(key.split(","), user);
        // `user` is represented by `uid`
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid, key]);

    const out: CampusLinkMap = {};
    if (uid) for (const r of key ? key.split(",") : []) {
        const links = known.get(r);
        if (links) out[r] = links;
    }
    return out;
}
