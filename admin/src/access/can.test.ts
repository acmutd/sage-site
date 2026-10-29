import { describe, expect, it } from "vitest";
import { can, type AdminAction } from "./can";

const ACTIONS: AdminAction[] = ["create", "update", "delete"];

describe("can", () => {
  it.each(ACTIONS)("lets admin %s directly", (action) => {
    expect(can("admin", action)).toBe("allowed");
  });

  it.each(ACTIONS)("turns %s into a suggestion for the suggest tier", (action) => {
    expect(can("suggest", action)).toBe("suggest");
  });

  it.each(ACTIONS)("denies %s for none and for no tier", (action) => {
    expect(can("none", action)).toBe("denied");
    expect(can(null, action)).toBe("denied");
  });
});
