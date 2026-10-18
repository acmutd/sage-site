import { parseRooms, type ParsedRoom } from "./rooms";

export interface CampusPoint {
    lat: number;
    lng: number;
    floor: number;
    name: string;
}

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
    SOM: [32.984887, -96.747158],
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

export const PARKING_STRUCTURE_4: CampusPoint = {
    lat: 32.986202,
    lng: -96.752838,
    floor: 0,
    name: "Parking Structure 4 (PS4)",
};

const CONCEPT3D_MAP = "https://map.concept3d.com/?id=1772";

export const campusPoint = (room: ParsedRoom): CampusPoint | null => {
    if (room.kind !== "room" || !room.building) return null;
    const coords = BUILDING_COORDS[room.building];
    if (!coords) return null;
    return { lat: coords[0], lng: coords[1], floor: room.floor ?? 0, name: room.label };
};

export const pointFromText = (text: string): CampusPoint | null => {
    const [room] = parseRooms(text);
    return room ? campusPoint(room) : null;
};

const enc = (s: string) => encodeURIComponent(s);

export const concept3dDirectionsUrl = (from: CampusPoint, to: CampusPoint, options: { accessible?: boolean } = {}): string =>
    `${CONCEPT3D_MAP}#!ct/type:walking;ada:${options.accessible ? "true" : "false"}` +
    `;from:${from.lat},${from.lng},${from.floor};to:${to.lat},${to.lng},${to.floor}` +
    `;startName:${enc(from.name)};endName:${enc(to.name)}`;

export const concept3dDestinationUrl = (to: CampusPoint): string => `${CONCEPT3D_MAP}#!s/?d/to:${to.lat},${to.lng},${to.floor};endName:${enc(to.name)}`;
