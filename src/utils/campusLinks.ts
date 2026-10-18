import type { User } from "firebase/auth";
import { getToken } from "./auth";

export interface CampusLinks {
    mapsUrl?: string;
    roomUrl?: string;
    wayfinderUrl?: string;
}

export type CampusLinkMap = Record<string, CampusLinks>;

const str = (...values: unknown[]): string | undefined => {
    for (const v of values) if (typeof v === "string" && v.trim()) return v;
    return undefined;
};

export const parseCampusLinks = (raw: unknown): CampusLinkMap => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: CampusLinkMap = {};
    for (const [room, value] of Object.entries(raw as Record<string, unknown>)) {
        if (!value || typeof value !== "object") continue; // null = unknown room
        const v = value as Record<string, unknown>;
        const links: CampusLinks = {
            mapsUrl: str(v.maps_url, v.mapsUrl),
            roomUrl: str(v.room_url, v.roomUrl),
            wayfinderUrl: str(v.wayfinder_url, v.wayfinderUrl),
        };
        if (links.mapsUrl || links.roomUrl || links.wayfinderUrl) out[room] = links;
    }
    return out;
};

export const campusUrl = (rooms: string[], base = import.meta.env.VITE_CRUD_API as string | undefined): string | null => {
    const unique = [...new Set(rooms.map(r => r.trim()).filter(Boolean))].sort();
    if (!base || unique.length === 0) return null;
    return `${base.replace(/\/$/, "")}/campus?rooms=${encodeURIComponent(unique.join(","))}`;
};

export async function getCampusLinks(rooms: string[], user: User | null | undefined, signal?: AbortSignal): Promise<CampusLinkMap | null> {
    const url = campusUrl(rooms);
    if (!url || !user) return null;
    try {
        const token = await getToken(user);
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal });
        if (!res.ok) return null;
        return parseCampusLinks(await res.json());
    } catch {
        return null;
    }
}
