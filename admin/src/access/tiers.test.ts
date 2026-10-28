import { describe, expect, it } from "vitest";
import { FIXTURE_OFFICERS, type DevOfficerCase } from "@/officers/fixtureOfficerDirectory";
import { meetsTier, resolveTier, type AccessTier } from "./tiers";
import { ADMIN_POSITIONS, PLACEHOLDER_SAGE_TEAM } from "./tierRules";

const EXPECTED_TIER: Record<DevOfficerCase, AccessTier> = {
  "non-sage-officer": "none",
  "sage-officer": "suggest",
  "sage-lead": "admin",
  "director-of-development": "admin",
  exec: "admin",
  "no-record": "none",
};

describe("resolveTier", () => {
  it.each(Object.entries(EXPECTED_TIER))("resolves the %s fixture to %s", (officerCase, tier) => {
    const record = FIXTURE_OFFICERS[officerCase as DevOfficerCase];
    expect(resolveTier(record && { email: "officer@acmutd.co", ...record })).toBe(tier);
  });

  it("denies when there is no record", () => {
    expect(resolveTier(null)).toBe("none");
  });

  it("grants admin for an admin position on any team", () => {
    expect(resolveTier({ email: "a@acmutd.co", team: "other", position: ADMIN_POSITIONS[0] })).toBe("admin");
  });

  it("denies unknown and empty values", () => {
    expect(resolveTier({ email: "a@acmutd.co", team: "", position: "" })).toBe("none");
    expect(resolveTier({ email: "a@acmutd.co", team: "unknown", position: "unknown" })).toBe("none");
  });

  it("matches the placeholder values exactly", () => {
    const team = PLACEHOLDER_SAGE_TEAM.toLowerCase();
    const position = ` ${ADMIN_POSITIONS[0]} `;
    expect(resolveTier({ email: "a@acmutd.co", team, position })).toBe("none");
  });
});

describe("meetsTier", () => {
  it("orders none < suggest < admin", () => {
    expect(meetsTier("admin", "suggest")).toBe(true);
    expect(meetsTier("suggest", "suggest")).toBe(true);
    expect(meetsTier("suggest", "admin")).toBe(false);
    expect(meetsTier("none", "suggest")).toBe(false);
  });

  it("fails without a tier", () => {
    expect(meetsTier(null, "suggest")).toBe(false);
  });
});
