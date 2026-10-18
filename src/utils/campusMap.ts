/**
 * Links into UT Dallas' Concept3D campus map (https://map.concept3d.com/?id=1772).
 *
 * The directions link format below was copied from a share link:
 *
 *   #!ct/<category ids>?d/type:walking;ada:false;from:LAT,LNG,FLOOR;to:LAT,LNG,FLOOR;startName:..;endName:..
 *
 * `from` and `to` are coordinates plus a floor number; the names are only labels.
 * So a room can only be linked to when we know its building's coordinates.
 */
import { parseRooms, type ParsedRoom } from "./rooms";

export interface CampusPoint {
    lat: number;
    lng: number;
    /** Floor number as Concept3D uses it (0 = ground / outdoors). */
    floor: number;
    /** Label shown in the map's directions panel. */
    name: string;
}

/**
 * Building positions as [latitude, longitude], keyed by coursebook building code.
 *
 * Taken from the "Building Labels" layer of the campus map itself (the label
 * abbreviations match the coursebook codes), so a route ends at the building as
 * the map draws it. SOM is the coursebook's code for the building the map calls
 * JSOM. Buildings are static, so this is a hardcoded copy; keep it current with
 * scripts/campus_buildings.py (check: new coursebook buildings, refresh: from a
 * saved map HAR).
 *
 * Not on the map's label layer, so no walking route (Google Maps links still
 * work for the ones with a name): CD1, CD2, APC1, RHNW, RHW, RHN, CBH, VCB.
 */
export const BUILDING_COORDS: Record<string, [number, number]> = {
    AB: [32.98518, -96.749553],
    AD: [32.989712, -96.748367],
    ATC: [32.986104, -96.74757],
    BE: [32.987671, -96.75046],
    BSB: [32.991535, -96.750046],
    CB: [32.9897, -96.749344],
    CR: [32.992481, -96.748535],
    CRA: [32.991722, -96.748421],
    ECSN: [32.986992, -96.750366],
    ECSS: [32.98624, -96.75042],
    ECSW: [32.986191, -96.751671],
    FN: [32.988144, -96.749359],
    FO: [32.987701, -96.749069],
    GR: [32.988659, -96.747871],
    HH: [32.986992, -96.751633],
    JO: [32.988759, -96.749],
    JSOM: [32.984887, -96.747158],
    SOM: [32.984887, -96.747158], // same building as JSOM
    MC: [32.986958, -96.74762],
    ML1: [32.98687, -96.752625],
    ML2: [32.98687, -96.753288],
    PHY: [32.989441, -96.750381],
    RL: [32.992561, -96.750443],
    ROC: [32.98629, -96.757126],
    SCI: [32.988945, -96.75032],
    SLC: [32.988235, -96.750397],
    SP2: [32.99498, -96.753494],
    SPN: [32.994007, -96.752197],
    TH: [32.988445, -96.748718],
};

/** Parking Structure 4, from the same share link. A sensible default starting point. */
export const PARKING_STRUCTURE_4: CampusPoint = {
    lat: 32.986202,
    lng: -96.752838,
    floor: 0,
    name: "Parking Structure 4 (PS4)",
};

const CONCEPT3D_MAP = "https://map.concept3d.com/?id=1772";
// Map layers switched on in the share link we copied.
const CATEGORY_IDS = "88641,88642,88643";

/**
 * Where to send someone for a room. Null when the room's building has no
 * coordinates. When the floor is unknown (e.g. SOM_12.218) we aim for the
 * ground floor, i.e. the building's entrance level.
 */
export const campusPoint = (room: ParsedRoom): CampusPoint | null => {
    if (room.kind !== "room" || !room.building) return null;
    const coords = BUILDING_COORDS[room.building];
    if (!coords) return null;
    return { lat: coords[0], lng: coords[1], floor: room.floor ?? 0, name: room.label };
};

/** Parse text typed by a person, e.g. "ECSS 2.201" or "ecss_2.201". Null if we cannot place it. */
export const pointFromText = (text: string): CampusPoint | null => {
    const [room] = parseRooms(text);
    return room ? campusPoint(room) : null;
};

const enc = (s: string) => encodeURIComponent(s);

/** Walking directions between two points. Works as an iframe src or a normal link. */
export const concept3dDirectionsUrl = (from: CampusPoint, to: CampusPoint, options: { accessible?: boolean } = {}): string =>
    `${CONCEPT3D_MAP}#!ct/${CATEGORY_IDS}?d/type:walking;ada:${options.accessible ? "true" : "false"}` +
    `;from:${from.lat},${from.lng},${from.floor};to:${to.lat},${to.lng},${to.floor}` +
    `;startName:${enc(from.name)};endName:${enc(to.name)}`;
