import { describe, expect, it } from "vitest";
import { parseMeeting, sectionLabel, walkBlockLayout } from "./walkTime";

describe("parseMeeting", () => {
    it("reads days and times in the coursebook format, with or without a space before AM/PM", () => {
        expect(parseMeeting({ days: "Monday, Wednesday", times_12h: "9:00 AM - 10:15 AM" })).toEqual({
            days: ["Monday", "Wednesday"], start: 540, end: 615,
        });
        expect(parseMeeting({ days: ["Tuesday"], times_12h: ["1:00pm - 2:15pm; 3:00pm - 4:00pm"] })).toEqual({
            days: ["Tuesday"], start: 780, end: 855,
        });
    });

    it("handles noon and midnight", () => {
        expect(parseMeeting({ days: "Friday", times_12h: "12:00 PM - 1:15 PM" })).toMatchObject({ start: 720, end: 795 });
        expect(parseMeeting({ days: "Friday", times_12h: "12:00 AM - 1:00 AM" })).toMatchObject({ start: 0, end: 60 });
    });

    it("is null without a usable time or days", () => {
        expect(parseMeeting({ days: "Monday", times_12h: "TBA" })).toBeNull();
        expect(parseMeeting({ days: "", times_12h: "9:00 AM - 10:00 AM" })).toBeNull();
        expect(parseMeeting({})).toBeNull();
    });
});

describe("sectionLabel", () => {
    it("is the upper-case course code, or a fallback", () => {
        expect(sectionLabel({ course_prefix: "cs", course_number: "1337" })).toBe("CS 1337");
        expect(sectionLabel({})).toBe("Class");
    });
});

describe("walkBlockLayout", () => {
    const ppm = 1.4;
    it("keeps a short walk visible and puts the label in the free part of a long break", () => {
        const l = walkBlockLayout({ walkMinutes: 2, gapMinutes: 15 }, ppm);
        expect(l.barPx).toBeGreaterThanOrEqual(5);
        expect(l.label).toBe("below");
    });
    it("puts the label inside a block tall enough for text", () => {
        expect(walkBlockLayout({ walkMinutes: 9, gapMinutes: 15 }, ppm).label).toBe("inside");
    });
    it("never draws past the break, and drops the label when there is no room", () => {
        const tight = walkBlockLayout({ walkMinutes: 9, gapMinutes: 5 }, ppm);
        expect(tight.barPx).toBeCloseTo(5 * ppm);
        expect(tight.label).toBe("none");
        expect(walkBlockLayout({ walkMinutes: 2, gapMinutes: 4 }, ppm).label).toBe("none");
    });
});