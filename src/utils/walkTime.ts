/**
 * Rough walking time between two classes, from the building coordinates alone.
 *
 * Outdoor distance blends straight-line (L2) and grid (L1) distance: d = ALPHA * L2 + (1 - ALPHA) * L1
 *
 * The constants were set from two real walks (the map's PS4 to SOM route, and a
 * skybridge walk from ECSS to AD that took about ten minutes). They are an
 * estimate, so this is where the UI always shows them with a "~".
 */
import { campusPoint } from "./campusMap";
import { parseRooms, type ParsedRoom } from "./rooms";
import { firstOf } from "./sections";

export const WALK_CONFIG = {
    alpha: 0.25,
    metersPerMinute: 80,
    bufferMinutes: 2,
    stairsMinutesPerFloor: 0.3,
    elevatorWaitMinutes: 1,
    elevatorMinutesPerFloor: 0.1,
};

const METERS_PER_DEG_LAT = 111_320;

type RoomInput = ParsedRoom | string | null | undefined;

const asRoom = (value: RoomInput): ParsedRoom | null => {
    if (!value) return null;
    if (typeof value !== "string") return value;
    return parseRooms(value)[0] ?? null;
};

export const walkMeters = (a: [number, number], b: [number, number]): number => {
    const meanLat = ((a[0] + b[0]) / 2) * (Math.PI / 180);
    const dy = (b[0] - a[0]) * METERS_PER_DEG_LAT;
    const dx = (b[1] - a[1]) * METERS_PER_DEG_LAT * Math.cos(meanLat);
    const straight = Math.hypot(dx, dy);
    const grid = Math.abs(dx) + Math.abs(dy);
    return WALK_CONFIG.alpha * straight + (1 - WALK_CONFIG.alpha) * grid;
};

const floorOf = (room: ParsedRoom): number | undefined => {
    if (room.floor !== undefined) return room.floor;
    const m = room.raw.match(/^[A-Za-z0-9]+[_ ](\d{1,2})\./);
    return m ? parseInt(m[1], 10) : undefined;
};

export const verticalMinutes = (floors: number): number => {
    const { stairsMinutesPerFloor, elevatorWaitMinutes, elevatorMinutesPerFloor } = WALK_CONFIG;
    if (floors <= 0) return 0;
    return Math.min(stairsMinutesPerFloor * floors, elevatorWaitMinutes + elevatorMinutesPerFloor * floors);
};

export const walkMinutes = (from: RoomInput, to: RoomInput): number | null => {
    const a = asRoom(from);
    const b = asRoom(to);
    if (!a || !b || a.kind !== "room" || b.kind !== "room") return null;
    const pa = campusPoint(a);
    const pb = campusPoint(b);
    if (!pa || !pb) return null;

    const { bufferMinutes, metersPerMinute } = WALK_CONFIG;
    if (a.building === b.building) {
        const fa = floorOf(a);
        const fb = floorOf(b);
        const floors = fa !== undefined && fb !== undefined ? Math.abs(fa - fb) : 0;
        return Math.ceil(bufferMinutes + verticalMinutes(floors));
    }
    const meters = walkMeters([pa.lat, pa.lng], [pb.lat, pb.lng]);
    return Math.ceil(meters / metersPerMinute + bufferMinutes);
};

export interface TimedSection {
    course_prefix?: string;
    course_number?: string;
    section?: string;
    days?: unknown;
    times_12h?: unknown;
    location?: unknown;
}

export interface Transition {
    day: string;
    from: TimedSection;
    to: TimedSection;
    fromRoom: ParsedRoom;
    toRoom: ParsedRoom;
    fromEnd: number;
    toStart: number;
    gapMinutes: number;
    walkMinutes: number;
    tight: boolean;
}

const to24 = (h: string, m: string, ap: string): number => {
    let hours = parseInt(h, 10);
    if (ap.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (ap.toUpperCase() === "AM" && hours === 12) hours = 0;
    return hours * 60 + (parseInt(m, 10) || 0);
};

const meeting = (sec: TimedSection): { days: string[]; start: number; end: number } | null => {
    const text = firstOf(sec.times_12h).split(";")[0].trim();
    const m = text.match(/(\d+):(\d+)\s*(AM|PM)\s*[-–]\s*(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return null;
    const rawDays = Array.isArray(sec.days) ? sec.days.map(String) : firstOf(sec.days).split(",");
    const days = rawDays.map(d => d.trim()).filter(Boolean);
    if (days.length === 0) return null;
    return { days, start: to24(m[1], m[2], m[3]), end: to24(m[4], m[5], m[6]) };
};

export const sectionLabel = (sec: TimedSection): string =>
    `${(sec.course_prefix ?? "").toUpperCase()} ${sec.course_number ?? ""}`.trim() || "Class";

/**
 * Every back-to-back pair of classes on the same day with a known walk estimate.
 * Sections whose rooms are unknown (TBA, online, unmapped building) skipped
 * and overlapping classes (those exist as conflicts).
 */
export const scheduleTransitions = (sections: TimedSection[]): Transition[] => {
    const byDay = new Map<string, { sec: TimedSection; start: number; end: number }[]>();
    for (const sec of sections) {
        const t = meeting(sec);
        if (!t) continue;
        for (const day of t.days) {
            const list = byDay.get(day) ?? [];
            list.push({ sec, start: t.start, end: t.end });
            byDay.set(day, list);
        }
    }

    const out: Transition[] = [];
    for (const [day, list] of byDay) {
        list.sort((x, y) => x.start - y.start);
        for (let i = 0; i + 1 < list.length; i++) {
            const a = list[i];
            const b = list[i + 1];
            const gap = b.start - a.end;
            if (gap < 0) continue;
            const fromRoom = asRoom(firstOf(a.sec.location).split(";")[0]);
            const toRoom = asRoom(firstOf(b.sec.location).split(";")[0]);
            const walk = walkMinutes(fromRoom, toRoom);
            if (walk === null || !fromRoom || !toRoom) continue;
            out.push({
                day, from: a.sec, to: b.sec, fromRoom, toRoom,
                gapMinutes: gap, walkMinutes: walk, tight: walk > gap,
                fromEnd: a.end, toStart: b.start,
            });
        }
    }
    return out;
};
