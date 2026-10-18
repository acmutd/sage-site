/**
 * Room parsing for coursebook `location` values.
 *
 * Real values in the 26f data include:
 *   "GR_2.530"                       building_floor.room
 *   "SOM 22.106"                     a space instead of the underscore
 *   "ATC_2.705E"                     room with a letter suffix
 *   "CD1_B.108"                      letter where a floor would be
 *   "ECSW_1.315; HH_2.402"           several rooms, sometimes in different buildings
 *   "ONLINE", "", "SIFRA"            not rooms at all
 */
import { firstOf } from "./sections";

export type RoomKind = "room" | "online" | "tba" | "other";

export interface ParsedRoom {
    /** The original text for this room, trimmed. */
    raw: string;
    kind: RoomKind;
    /** Upper-case building code, e.g. "ECSW". Only set when kind is "room". */
    building?: string;
    /** Full building name. Only set for codes verified in BUILDINGS below. */
    buildingName?: string;
    /** Floor number. Only set when the floor token is a single digit (1-9). */
    floor?: number;
    /** Room as written after the floor, e.g. "315" or "705E". */
    room?: string;
    /** Short display label, e.g. "ECSW 1.315", "Online", "TBA". */
    label: string;
}

/**
 * Building names, taken from the UT Dallas 2024 campus map legend
 * (sites.utdallas.edu .../campus-map-2024.pdf) and dox.utdallas.edu/map1003.
 *
 * Codes that appear in the coursebook data but are NOT in either source are
 * deliberately missing: CD1, CD2, APC1, RHNW, RHW, RHN, CBH. Without a verified
 * name those rooms still display ("CD1 B.108") but get no map link. Add a line
 * here once you know the name.
 */
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
    // The campus map lists JSOM; coursebook rooms use SOM (881 sections) and JSOM (2).
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

/**
 * Parse a coursebook location into one entry per room. Accepts a string
 * ("A; B"), an array, or nothing. Always returns at least one entry
 * (a "tba" room when there is nothing to show).
 */
export const parseRooms = (value: unknown): ParsedRoom[] => {
    const parts = (Array.isArray(value) ? value.map(v => firstOf(v)) : [firstOf(value)])
        .flatMap(v => v.split(";"))
        .map(v => v.trim())
        .filter(Boolean);

    if (parts.length === 0) return [{ raw: "", kind: "tba", label: "TBA" }];
    return parts.map(parseOne);
};

/** Plain-text room for places that cannot render components (exports, tooltips). */
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

/** Google Maps search for the building. Null when the building name is not verified. */
export const mapsUrl = (room: ParsedRoom): string | null => {
    const q = mapsQuery(room);
    return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
};

/** Walking directions to the building from the viewer's current location. */
export const directionsUrl = (room: ParsedRoom): string | null => {
    const q = mapsQuery(room);
    return q
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=walking`
        : null;
};
