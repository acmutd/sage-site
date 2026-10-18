import { describe, expect, it } from "vitest";
import { campusUrl, parseCampusLinks } from "./campusLinks";

describe("campusUrl", () => {
    it("dedupes and sorts so one set of rooms is one URL", () => {
        expect(campusUrl(["MC_2.402", "ECSW_3.250", "MC_2.402"], "https://x/CRUD"))
            .toBe("https://x/CRUD/campus?rooms=ECSW_3.250%2CMC_2.402");
    });
    it("is null with nothing to ask or no base", () => {
        expect(campusUrl([], "https://x/CRUD")).toBeNull();
        expect(campusUrl(["A_1.1"], "")).toBeNull();
    });
});

describe("parseCampusLinks", () => {
    it("reads the server's links and skips rooms it could not resolve", () => {
        expect(parseCampusLinks({
            "ECSW_3.250": { maps_url: "m", room_url: "r", wayfinder_url: "w" },
            "MC 2.402": { maps_url: "m2", room_url: null, wayfinder_url: "w2" },
            "CD1_B.108": null,
            "EMPTY": {},
        })).toEqual({
            "ECSW_3.250": { mapsUrl: "m", roomUrl: "r", wayfinderUrl: "w" },
            "MC 2.402": { mapsUrl: "m2", roomUrl: undefined, wayfinderUrl: "w2" },
        });
    });
    it("tolerates junk", () => {
        expect(parseCampusLinks(null)).toEqual({});
        expect(parseCampusLinks([])).toEqual({});
    });
});