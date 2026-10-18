import { describe, expect, it } from "vitest";
import { BUILDING_COORDS, campusPoint, concept3dDestinationUrl, pointFromText } from "./campusMap";
import { BUILDINGS, parseRooms } from "./rooms";

describe("campusPoint", () => {
    it("uses the building coordinates and the room's floor", () => {
        expect(campusPoint(parseRooms("ECSS_2.306")[0])).toEqual({
            lat: 32.98624,
            lng: -96.75042,
            floor: 2,
            name: "ECSS 2.306",
        });
    });

    it("falls back to ground level when the floor is unknown", () => {
        const [r] = parseRooms("ECSS_12.218");
        expect(r.floor).toBeUndefined();
        expect(campusPoint(r)?.floor).toBe(0);
    });

    it("is null for buildings without coordinates, and for non-rooms", () => {
        expect(campusPoint(parseRooms("CD1_B.108")[0])).toBeNull();
        expect(campusPoint(parseRooms("ONLINE")[0])).toBeNull();
        expect(campusPoint(parseRooms("")[0])).toBeNull();
    });
});

describe("pointFromText", () => {
    it("accepts what a person would type", () => {
        expect(pointFromText("ecss 2.201")?.name).toBe("ECSS 2.201");
        expect(pointFromText("ECSS_2.201")?.floor).toBe(2);
    });
    it("rejects junk", () => {
        expect(pointFromText("hello")).toBeNull();
        expect(pointFromText("")).toBeNull();
    });
});

describe("concept3dDestinationUrl", () => {
    it("fills in only the destination, in the form from Concept3D's wayfinding guide", () => {
        const to = { lat: 32.98624, lng: -96.75042, floor: 2, name: "ECSS 2.306" };
        expect(concept3dDestinationUrl(to)).toBe(
            "https://map.concept3d.com/?id=1772#!s/?d/to:32.98624,-96.75042,2;endName:ECSS%202.306",
        );
        expect(concept3dDestinationUrl(to)).not.toContain("from:");
    });
});

describe("BUILDING_COORDS", () => {
    it("only has plausible UT Dallas coordinates", () => {
        for (const [code, [lat, lng]] of Object.entries(BUILDING_COORDS)) {
            expect(code).toBe(code.toUpperCase());
            expect(lat).toBeGreaterThan(32.97);
            expect(lat).toBeLessThan(33.0);
            expect(lng).toBeGreaterThan(-96.77);
            expect(lng).toBeLessThan(-96.73);
        }
    });
    it("covers every named building except the Visitor Center (not on the map's label layer)", () => {
        expect(Object.keys(BUILDINGS).filter(code => !BUILDING_COORDS[code])).toEqual(["VCB"]);
    });
    it("gives SOM and JSOM the same spot", () => {
        expect(BUILDING_COORDS.SOM).toEqual(BUILDING_COORDS.JSOM);
    });
    it("has a verified name for every building it covers", () => {
        for (const code of Object.keys(BUILDING_COORDS)) expect(BUILDINGS[code]).toBeDefined();
    });
});
