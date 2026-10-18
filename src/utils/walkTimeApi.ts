import type { User } from "firebase/auth";
import { getToken } from "./auth";
import { firstOf } from "./sections";
import { parseRooms } from "./rooms";
import { parseMeeting, type TimedSection, type Transition } from "./walkTime";

export interface WalkSectionPayload {
    course_prefix: string;
    course_number: string;
    section: string;
    days: string[];
    times_12h: string;
    location: string;
}

const compactTime = (text: string): string =>
    text.replace(/\s*(AM|PM)\b/gi, (_, ap: string) => ap.toLowerCase());

export const toWalkPayload = (sections: TimedSection[]): WalkSectionPayload[] => {
    const out: WalkSectionPayload[] = [];
    for (const sec of sections) {
        const meeting = parseMeeting(sec);
        if (!meeting) continue;
        const room = parseRooms(firstOf(sec.location).split(";")[0])[0];
        if (!room || room.kind !== "room") continue;
        out.push({
            course_prefix: String(sec.course_prefix ?? ""),
            course_number: String(sec.course_number ?? ""),
            section: String(sec.section ?? "").trim(),
            days: meeting.days,
            times_12h: compactTime(firstOf(sec.times_12h).split(";")[0].trim()),
            location: room.label, // "ECSW 1.315"
        });
    }
    return out;
};

const keyOf = (s: { course_prefix?: unknown; course_number?: unknown; section?: unknown }): string =>
    `${String(s.course_prefix ?? "").toUpperCase()}${String(s.course_number ?? "")}.${String(s.section ?? "").trim()}`.toLowerCase();

const num = (...values: unknown[]): number | null => {
    for (const v of values) {
        const n = typeof v === "string" ? Number(v) : v;
        if (typeof n === "number" && Number.isFinite(n)) return n;
    }
    return null;
};

export const parseWalkTimes = (raw: unknown, sent: TimedSection[]): Transition[] => {
    const rows = (raw as { transitions?: unknown })?.transitions;
    if (!Array.isArray(rows)) return [];
    const byKey = new Map(sent.map(s => [keyOf(s), s]));
    // Fallback when `from`/`to` do not identify a section: the day, end/start minute and room still do.
    const roomOf = (s: TimedSection) => parseRooms(firstOf(s.location).split(";")[0])[0]?.label;
    const findByTime = (day: unknown, minute: unknown, edge: "start" | "end", room: unknown) =>
        sent.find(s => {
            const m = parseMeeting(s);
            return !!m && m.days.includes(String(day)) && m[edge] === minute
                && (typeof room !== "string" || roomOf(s) === parseRooms(room)[0]?.label);
        });

    const out: Transition[] = [];
    for (const row of rows as Record<string, any>[]) {
        const from = byKey.get(keyOf(row?.from ?? {}))
            ?? findByTime(row?.day, num(row?.from_end, row?.fromEnd), "end", row?.from_room);
        const to = byKey.get(keyOf(row?.to ?? {}))
            ?? findByTime(row?.day, num(row?.to_start, row?.toStart), "start", row?.to_room);
        const walk = num(row?.walk_minutes, row?.walkMinutes);
        const gap = num(row?.gap_minutes, row?.gapMinutes);
        if (!from || !to || walk === null || gap === null || typeof row?.day !== "string") continue;

        const fromMeeting = parseMeeting(from);
        const toMeeting = parseMeeting(to);
        const fromRoom = parseRooms(firstOf(from.location).split(";")[0])[0];
        const toRoom = parseRooms(firstOf(to.location).split(";")[0])[0];
        if (!fromMeeting || !toMeeting || !fromRoom || !toRoom) continue;

        out.push({
            day: row.day,
            from, to, fromRoom, toRoom,
            fromEnd: fromMeeting.end,
            toStart: toMeeting.start,
            gapMinutes: gap,
            walkMinutes: walk,
            tight: typeof row.tight === "boolean" ? row.tight : walk > gap,
        });
    }
    return out;
};

export const fetchWalkTimes = async (
    sections: TimedSection[],
    user: User | null | undefined,
    signal?: AbortSignal,
): Promise<Transition[] | null> => {
    const api = import.meta.env.VITE_CRUD_API as string | undefined;
    const payload = toWalkPayload(sections);
    if (!api || !user || payload.length < 2) return [];

    try {
        const token = await getToken(user);
        const res = await fetch(api, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.uid, token, action: "getWalkTimes", sections: payload }),
            signal,
        });
        if (!res.ok) return null;
        // match against the payload we sent, so the room and time shown are what the server saw
        return parseWalkTimes(await res.json(), payload.map(p => ({ ...p })));
    } catch {
        return null;
    }
};
