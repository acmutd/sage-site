import { firstOf } from "./sections";

export type RoomKind = "room" | "online" | "tba" | "other";

export interface ParsedRoom {
    raw: string;
    kind: RoomKind;
    building?: string;
    buildingName?: string;
    floor?: number;
    room?: string;
    label: string;
}

export const BUILDINGS: Record<string, string> = {
    AB: "Activity Center",
    AD: "Administration",
    ATC: "Edith O'Donnell Arts and Technology Building",
    BE: "Lloyd V. Berkner Hall",
    BSB: "Bioengineering and Sciences Building",
    CB: "Classroom Building",
    CR: "Callier Center Richardson",
    CRA: "Callier Center Addition",
    ECSN: "Engineering and Computer Science North",
    ECSS: "Engineering and Computer Science South",
    ECSW: "Engineering and Computer Science West",
    FN: "Founders North",
    FO: "Founders Building",
    GR: "Cecil H. Green Hall",
    HH: "Karl Hoblitzelle Hall",
    JO: "Erik Jonsson Academic Center",
    JSOM: "Naveen Jindal School of Management",
    SOM: "Naveen Jindal School of Management",
    MC: "Eugene McDermott Library",
    ML1: "Modular Lab 1",
    ML2: "Modular Lab 2",
    PHY: "Physics Building",
    RL: "Natural Science and Engineering Research Lab",
    ROC: "Research and Operations Center",
    SCI: "Sciences Building",
    SLC: "Science Learning Center",
    SP2: "Synergy Park North 2",
    SPN: "Synergy Park North",
    TH: "University Theater",
    VCB: "Visitor Center and University Bookstore",
};

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
    // Only 1-9 is a real floor. Tokens such as "12" (SOM_12.218, CRA_12.125) or a
    // letter (CD1_B.108) follow a different numbering, so claim no floor for them.
    const hasFloor = /^[1-9]$/.test(floorToken);

    return {
        raw,
        kind: "room",
        building,
        buildingName: BUILDINGS[building],
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

const mapsQuery = (room: ParsedRoom): string | null =>
    room.buildingName ? `${room.buildingName}, The University of Texas at Dallas` : null;

export const mapsUrl = (room: ParsedRoom): string | null => {
    const q = mapsQuery(room);
    return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
};
