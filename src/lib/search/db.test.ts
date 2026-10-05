import { afterEach, describe, expect, it } from "vitest";
import { searchDbName, DB_NAME_PREFIX } from "./schema";
import { configureSearchUser, getActiveSearchUser, isSearchReady } from "./db";

afterEach(() => {
  configureSearchUser(null);
});

describe("searchDbName", () => {
  it("gives each user their own database", () => {
    expect(searchDbName("alice")).not.toEqual(searchDbName("bob"));
    expect(searchDbName("alice")).toBe(`${DB_NAME_PREFIX}_alice`);
  });
});

describe("configureSearchUser", () => {
  it("reports whether the user actually changed", () => {
    expect(configureSearchUser("alice")).toBe(true);
    expect(configureSearchUser("alice")).toBe(false);
    expect(configureSearchUser("bob")).toBe(true);
    expect(getActiveSearchUser()).toBe("bob");
  });

  it("unbinds on sign-out", () => {
    configureSearchUser("alice");
    expect(configureSearchUser(null)).toBe(true);
    expect(getActiveSearchUser()).toBeNull();
  });
});

describe("isSearchReady", () => {
  it("stays false until a user is bound", () => {
    // Guards every ingestion path, so an unbound corpus silently no-ops rather
    // than writing one student's messages into whatever database is open.
    expect(isSearchReady()).toBe(false);
    configureSearchUser("alice");
    // Still false here only because this environment has no IndexedDB; the
    // point is that binding a user is necessary, not that it is sufficient.
    expect(getActiveSearchUser()).toBe("alice");
  });
});
