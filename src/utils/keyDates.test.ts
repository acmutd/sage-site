import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CACHE_KEY,
  KeyDateRecord,
  chicagoToday,
  computeActive,
  daysBetween,
  dismiss,
  eventKey,
  getDismissed,
  getSeen,
  loadKeyDates,
  markSeen,
  pickAnnouncement,
  pickBanner,
  pruneState,
} from "./keyDates";

const appt: KeyDateRecord = { term: "spring-2027", type: "enrollment_appt", date: "2026-10-19" };
const grades: KeyDateRecord = { term: "fall-2026", type: "grades_viewable", date: "2026-12-17" };

beforeEach(() => localStorage.clear());

describe("daysBetween / chicagoToday", () => {
  it("counts whole days", () => {
    expect(daysBetween("2026-10-12", "2026-10-19")).toBe(7);
    expect(daysBetween("2026-10-19", "2026-10-12")).toBe(-7);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });
  it("uses Chicago, not UTC", () => {
    // 03:00 UTC on Oct 20 is still Oct 19 evening in Chicago (CDT)
    expect(chicagoToday(new Date("2026-10-20T03:00:00Z"))).toBe("2026-10-19");
  });
});

describe("computeActive windows", () => {
  it("enrollment appt: Oct 12 - Nov 1 (inclusive), nothing outside", () => {
    expect(computeActive([appt], "2026-10-11")).toHaveLength(0);
    expect(computeActive([appt], "2026-10-12")).toHaveLength(1);
    expect(computeActive([appt], "2026-10-19")).toHaveLength(1);
    expect(computeActive([appt], "2026-11-01")).toHaveLength(1);
    expect(computeActive([appt], "2026-11-02")).toHaveLength(0);
  });
  it("grades: Dec 17 - Jan 6", () => {
    expect(computeActive([grades], "2026-12-16")).toHaveLength(0);
    expect(computeActive([grades], "2026-12-17")).toHaveLength(1);
    expect(computeActive([grades], "2027-01-06")).toHaveLength(1);
    expect(computeActive([grades], "2027-01-07")).toHaveLength(0);
  });
  it("daysLeft counts down, last day is 1", () => {
    expect(computeActive([appt], "2026-10-12")[0].daysLeft).toBe(21);
    expect(computeActive([appt], "2026-11-01")[0].daysLeft).toBe(1);
  });
  it("wording switches from 'open' to 'are open' after the date", () => {
    expect(computeActive([appt], "2026-10-15")[0].message).toContain("open Monday, October 19");
    expect(computeActive([appt], "2026-10-20")[0].message).toContain("are open");
  });
  it("ignores malformed records and unknown types", () => {
    const bad = [
      { term: "x-1", type: "nope", date: "2026-10-19" },
      { term: "x-1", type: "enrollment_appt", date: "bad" },
    ] as unknown as KeyDateRecord[];
    expect(computeActive(bad, "2026-10-19")).toHaveLength(0);
  });
});

describe("dismiss / seen state", () => {
  it("banner skips dismissed, announcement skips seen", () => {
    const active = computeActive([appt], "2026-10-15");
    expect(pickBanner(active)).toBeDefined();
    dismiss(active[0].key);
    expect(pickBanner(active)).toBeUndefined();
    expect(pickAnnouncement(active)).toBeDefined(); // independent of dismissal
    markSeen(active[0].key);
    expect(pickAnnouncement(active)).toBeUndefined();
  });
  it("a changed date yields a fresh key (re-announces)", () => {
    dismiss(eventKey(appt));
    const moved = { ...appt, date: "2026-10-26" };
    expect(pickBanner(computeActive([moved], "2026-10-20"))).toBeDefined();
  });
  it("prune drops stale keys, but not on an empty load", () => {
    dismiss(eventKey(appt));
    markSeen(eventKey(appt));
    pruneState([]);
    expect(getDismissed()).toHaveLength(1);
    pruneState([grades]);
    expect(getDismissed()).toHaveLength(0);
    expect(getSeen()).toHaveLength(0);
  });
});

describe("loadKeyDates cache", () => {
  it("fetches once, then serves from fresh cache", async () => {
    const f = vi.fn().mockResolvedValue([appt]);
    await loadKeyDates(f, 1_000);
    await loadKeyDates(f, 1_000 + 60_000);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("refetches after TTL", async () => {
    const f = vi.fn().mockResolvedValue([appt]);
    await loadKeyDates(f, 0);
    await loadKeyDates(f, 7 * 60 * 60 * 1000);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("falls back to stale cache when fetch fails", async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: 0, records: [grades] }));
    const f = vi.fn().mockRejectedValue(new Error("down"));
    expect(await loadKeyDates(f, 99 * 60 * 60 * 1000)).toEqual([grades]);
  });
  it("returns [] when fetch fails and nothing cached", async () => {
    expect(await loadKeyDates(vi.fn().mockRejectedValue(new Error("x")), 0)).toEqual([]);
  });
  it("survives corrupt cache JSON", async () => {
    localStorage.setItem(CACHE_KEY, "{not json");
    expect(await loadKeyDates(vi.fn().mockResolvedValue([appt]), 0)).toEqual([appt]);
  });
});
