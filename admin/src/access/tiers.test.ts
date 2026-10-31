import { describe, expect, it } from "vitest";
import { meetsTier } from "./tiers";

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
