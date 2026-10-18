import { describe, expect, it } from "vitest";
import { scheduleTransitions, verticalMinutes, walkMinutes, walkMeters } from "./walkTime";

describe("walkMinutes", () => {
    it("matches the walks we measured, within a minute or two", () => {
        expect(walkMinutes("ECSS_2.306", "AD_3.200")).toBe(9);
        expect(walkMinutes("ECSS 3.100", "AD 1.100")).toBe(9);
    });

    it("is symmetric and grows with distance", () => {
        expect(walkMinutes("ECSS_2.306", "SOM_12.218")).toBe(walkMinutes("SOM_12.218", "ECSS_2.306"));
        expect(walkMinutes("ECSS_2.306", "ECSW_1.315")!).toBeLessThan(walkMinutes("ECSS_2.306", "SP2_1.100")!);
    });

    it("inside one building: the buffer plus stairs or elevator, whichever is faster", () => {
        expect(walkMinutes("ECSS_2.306", "ECSS_2.401")).toBe(2);
        expect(walkMinutes("ECSS_2.306", "ECSS_3.401")).toBe(3);
        expect(walkMinutes("SOM_2.106", "SOM_12.218")).toBe(4);
        expect(walkMinutes("ECSS_2.306", "ECSS_4.401")).toBe(3);
        expect(walkMinutes("ECSS_2.306", "ECSS_B.401")).toBe(2);
    });

    it("vertical time is capped by the elevator, so it grows slowly", () => {
        expect(verticalMinutes(0)).toBe(0);
        expect(verticalMinutes(1)).toBeCloseTo(0.3);
        expect(verticalMinutes(10)).toBeCloseTo(2);
        expect(verticalMinutes(10)).toBeLessThan(verticalMinutes(1) * 10);
    });

    it("gives nothing when a room is unknown, online, TBA or in an unmapped building", () => {
        expect(walkMinutes("ECSS_2.306", "CD1_B.108")).toBeNull();
        expect(walkMinutes("ECSS_2.306", "ONLINE")).toBeNull();
        expect(walkMinutes("ECSS_2.306", "")).toBeNull();
        expect(walkMinutes(null, "AD_3.200")).toBeNull();
    });

    it("never exceeds sqrt(2) times the straight line", () => {
        const a: [number, number] = [32.98624, -96.75042];
        const b: [number, number] = [32.989712, -96.748367];
        const straight = Math.hypot(386.5, 191.7);
        expect(walkMeters(a, b)).toBeGreaterThan(straight);
        expect(walkMeters(a, b)).toBeLessThan(straight * Math.SQRT2);
    });
});

const sec = (course_number: string, days: string, times_12h: string, location: string) => ({
    course_prefix: "cs", course_number, section: "001", days, times_12h, location,
});

describe("scheduleTransitions", () => {
    it("flags a walk that is longer than the gap, same day only", () => {
        const t = scheduleTransitions([
            sec("1337", "Monday, Wednesday", "9:00 AM - 10:15 AM", "ECSS_2.306"),
            sec("2336", "Monday", "10:20 AM - 11:35 AM", "AD_3.200"),
            sec("3345", "Tuesday", "10:20 AM - 11:35 AM", "SP2_1.100"),
        ]);
        expect(t).toHaveLength(1);
        expect(t[0]).toMatchObject({ day: "Monday", gapMinutes: 5, walkMinutes: 9, tight: true });
    });

    it("does not flag a comfortable gap, and accepts arrays and several rooms", () => {
        const t = scheduleTransitions([
            sec("1337", "Monday", "9:00 AM - 10:15 AM", "ECSS_2.306; HH_2.402"),
            { ...sec("2336", "Monday", "11:00 AM - 12:15 PM", "AD_3.200"), days: ["Monday"], times_12h: ["11:00 AM - 12:15 PM"] },
        ]);
        expect(t).toHaveLength(1);
        expect(t[0].tight).toBe(false);
        expect(t[0].gapMinutes).toBe(45);
    });

    it("skips overlaps, unknown rooms and unparseable times", () => {
        expect(scheduleTransitions([
            sec("1", "Monday", "9:00 AM - 10:15 AM", "ECSS_2.306"),
            sec("2", "Monday", "10:00 AM - 11:00 AM", "AD_3.200"), // overlap: a conflict, not a transition
            sec("3", "Monday", "1:00 PM - 2:00 PM", "TBA"),
            sec("4", "Monday", "TBA", "AD_3.200"),
        ])).toEqual([]);
    });
});
