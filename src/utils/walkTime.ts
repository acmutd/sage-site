import type { ParsedRoom } from "./rooms";
import { firstOf } from "./sections";

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

export const parseMeeting = (sec: TimedSection): { days: string[]; start: number; end: number } | null => {
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


export interface WalkBlockLayout {
    barPx: number;
    label: "inside" | "below" | "none";
}

const MIN_BAR_PX = 5;
const LABEL_PX = 10;

export const walkBlockLayout = (t: Pick<Transition, "walkMinutes" | "gapMinutes">, pxPerMin: number): WalkBlockLayout => {
    const gapPx = t.gapMinutes * pxPerMin;
    const barPx = Math.min(gapPx, Math.max(t.walkMinutes * pxPerMin, MIN_BAR_PX));
    if (barPx >= LABEL_PX) return { barPx, label: "inside" };
    if (gapPx - barPx >= LABEL_PX) return { barPx, label: "below" };
    return { barPx, label: "none" };
};