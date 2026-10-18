import { firstOf } from "./sections";

export type RoomKind = "room" | "online" | "tba" | "other";

export interface ParsedRoom {
    raw: string;
    kind: RoomKind;
    building?: string;
    floor?: number;
    room?: string;
    label: string;
}

const ROOM_PATTERN = /^([A-Za-z][A-Za-z0-9]*)[_ ]([A-Za-z0-9]+)\.([A-Za-z0-9]+)$/;
const TBA_VALUES = new Set(["", "tba", "tbd", "to be announced", "no meeting room"]);
const ONLINE_VALUES = new Set(["online", "internet"]);

const parseOne = (rawValue: string): ParsedRoom => {
    const raw = rawValue.trim();
    const lower = raw.toLowerCase();

    if (TBA_VALUES.has(lower)) return { raw, kind: "tba", label: "TBA" };
    if (ONLINE_VALUES.has(lower)) return { raw, kind: "online", label: "Online" };

    const m = ROOM_PATTERN.exec(raw);
    if (!m) return { raw, kind: "other", label: raw };

    const building = m[1].toUpperCase();
    const floorToken = m[2];
    const hasFloor = /^[1-9]$/.test(floorToken);

    return {
        raw,
        kind: "room",
        building,
        floor: hasFloor ? Number(floorToken) : undefined,
        room: hasFloor ? m[3] : `${floorToken}.${m[3]}`,
        label: `${building} ${floorToken}.${m[3]}`,
    };
};


export const parseRooms = (value: unknown): ParsedRoom[] => {
    const parts = (Array.isArray(value) ? value.map(v => firstOf(v)) : [firstOf(value)])
        .flatMap(v => v.split(";"))
        .map(v => v.trim())
        .filter(Boolean);

    if (parts.length === 0) return [{ raw: "", kind: "tba", label: "TBA" }];
    return parts.map(parseOne);
};

export const formatRoom = (value: unknown, options: { empty?: string; separator?: string } = {}): string => {
    const { empty = "TBA", separator = " / " } = options;
    const rooms = parseRooms(value);
    if (rooms.every(r => r.kind === "tba")) return empty;
    return rooms.filter(r => r.kind !== "tba").map(r => r.label).join(separator);
};

export const floorLabel = (room: ParsedRoom): string | null =>
    room.floor !== undefined ? `Floor ${room.floor}` : null;