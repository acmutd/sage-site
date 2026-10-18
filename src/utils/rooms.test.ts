import { describe, expect, it } from "vitest";
import { BUILDINGS, directionsUrl, floorLabel, formatRoom, mapsUrl, parseRooms } from "./rooms";
import { firstOf, firstTime } from "./sections";

describe("parseRooms", () => {
    it("parses a standard room", () => {
        const [r] = parseRooms("GR_2.530");
        expect(r).toMatchObject({
            kind: "room",
            building: "GR",
            buildingName: "Cecil H. Green Hall",
            floor: 2,
            room: "530",
            label: "GR 2.530",
        });
        expect(floorLabel(r)).toBe("Floor 2");
    });

    it("accepts a space instead of an underscore", () => {
        const [r] = parseRooms("ECSS 2.301");
        expect(r).toMatchObject({ kind: "room", building: "ECSS", floor: 2, room: "301", label: "ECSS 2.301" });
    });

    it("keeps letter suffixes on the room", () => {
        expect(parseRooms("ATC_2.705E")[0]).toMatchObject({ floor: 2, room: "705E", label: "ATC 2.705E" });
    });

    it("does not claim a floor for multi-digit tokens like SOM_12.218", () => {
        const [r] = parseRooms("SOM_12.218");
        expect(r.kind).toBe("room");
        expect(r.floor).toBeUndefined();
        expect(r.room).toBe("12.218");
        expect(r.label).toBe("SOM 12.218");
        expect(floorLabel(r)).toBeNull();
    });

    it("does not claim a floor for letter tokens like CD1_B.108", () => {
        const [r] = parseRooms("CD1_B.108");
        expect(r).toMatchObject({ kind: "room", building: "CD1", label: "CD1 B.108" });
        expect(r.floor).toBeUndefined();
    });

    it("leaves unverified buildings without a name", () => {
        const [r] = parseRooms("CD1_B.108");
        expect(r.buildingName).toBeUndefined();
        expect(mapsUrl(r)).toBeNull();
        expect(directionsUrl(r)).toBeNull();
    });

    it("splits multiple rooms, including across buildings", () => {
        const rooms = parseRooms("ECSW_1.315; HH_2.402");
        expect(rooms.map(r => r.label)).toEqual(["ECSW 1.315", "HH 2.402"]);
        expect(rooms.map(r => r.building)).toEqual(["ECSW", "HH"]);
    });

    it("treats online values as online", () => {
        expect(parseRooms("ONLINE")[0]).toMatchObject({ kind: "online", label: "Online" });
        expect(parseRooms("online")[0].kind).toBe("online");
    });

    it.each([[""], ["   "], [null], [undefined], ["TBA"], ["tbd"], ["No Meeting Room"], [[]]])("treats %j as TBA", value => {
        const rooms = parseRooms(value);
        expect(rooms).toHaveLength(1);
        expect(rooms[0]).toMatchObject({ kind: "tba", label: "TBA" });
    });

    it("keeps non-room text such as SIFRA as-is", () => {
        expect(parseRooms("SIFRA")[0]).toMatchObject({ kind: "other", label: "SIFRA" });
    });

    it("accepts arrays", () => {
        expect(parseRooms(["GR_2.530"])[0].label).toBe("GR 2.530");
        expect(parseRooms(["GR_2.530", "HH_2.402"]).map(r => r.label)).toEqual(["GR 2.530", "HH 2.402"]);
    });
});

describe("formatRoom", () => {
    it("formats a room", () => expect(formatRoom("GR_2.530")).toBe("GR 2.530"));
    it("joins several rooms with ' / '", () =>
        expect(formatRoom("ECSW_1.315; HH_2.402")).toBe("ECSW 1.315 / HH 2.402"));
    it("falls back to TBA", () => {
        expect(formatRoom("")).toBe("TBA");
        expect(formatRoom(undefined)).toBe("TBA");
    });
    it("honours a custom empty value", () => expect(formatRoom("", { empty: "" })).toBe(""));
    it("never throws on arrays", () => expect(formatRoom(["GR_2.530"])).toBe("GR 2.530"));
});

describe("map links", () => {
    it("builds a Google Maps search from the verified building name", () => {
        const url = mapsUrl(parseRooms("GR_2.530")[0])!;
        expect(url.startsWith("https://www.google.com/maps/search/?api=1&query=")).toBe(true);
        expect(decodeURIComponent(url)).toContain("Cecil H. Green Hall, The University of Texas at Dallas");
    });

    it("builds walking directions", () => {
        const url = directionsUrl(parseRooms("ECSW_1.315")[0])!;
        expect(url).toContain("destination=");
        expect(url).toContain("travelmode=walking");
    });

    it("encodes the apostrophe in ATC's name", () => {
        const url = mapsUrl(parseRooms("ATC_2.705E")[0])!;
        expect(decodeURIComponent(url)).toContain("Edith O'Donnell");
    });

    it("has no map link for online or TBA", () => {
        expect(mapsUrl(parseRooms("ONLINE")[0])).toBeNull();
        expect(mapsUrl(parseRooms("")[0])).toBeNull();
    });
});

describe("BUILDINGS", () => {
    it("has upper-case keys only", () => {
        for (const key of Object.keys(BUILDINGS)) expect(key).toBe(key.toUpperCase());
    });
});

describe("sections helpers", () => {
    it("firstOf handles strings, arrays and missing values", () => {
        expect(firstOf("a")).toBe("a");
        expect(firstOf(["a", "b"])).toBe("a");
        expect(firstOf([])).toBe("");
        expect(firstOf(null)).toBe("");
        expect(firstOf(undefined)).toBe("");
    });

    it("firstTime returns the first meeting time", () => {
        expect(firstTime("10:00 AM - 11:15 AM; 2:00 PM - 3:00 PM")).toBe("10:00 AM - 11:15 AM");
        expect(firstTime(["1:00 PM - 2:15 PM"])).toBe("1:00 PM - 2:15 PM");
        expect(firstTime(undefined)).toBe("");
    });
});
