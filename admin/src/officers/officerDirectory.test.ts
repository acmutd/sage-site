import { afterEach, describe, expect, it, vi } from "vitest";
import { DEV_OFFICER_CASES, FIXTURE_OFFICERS, createFixtureOfficerDirectory } from "./fixtureOfficerDirectory";
import { loadOfficerDirectory } from ".";
import { createEmptyOfficerDirectory } from "./officerDirectory";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("createFixtureOfficerDirectory", () => {
  it.each(DEV_OFFICER_CASES.filter((name) => name !== "no-record"))(
    "answers %s for whichever account signs in",
    async (officerCase) => {
      const record = await createFixtureOfficerDirectory(officerCase).getMyRecord("anyone@acmutd.co");

      expect(record).toEqual({ email: "anyone@acmutd.co", ...FIXTURE_OFFICERS[officerCase] });
    },
  );

  it("has no record for the no-record case", async () => {
    await expect(createFixtureOfficerDirectory("no-record").getMyRecord("anyone@acmutd.co")).resolves.toBeNull();
  });
});

describe("createEmptyOfficerDirectory", () => {
  it("never has a record", async () => {
    await expect(createEmptyOfficerDirectory().getMyRecord("officer@acmutd.co")).resolves.toBeNull();
  });
});

describe("loadOfficerDirectory", () => {
  it("uses the empty directory outside development, whatever the case says", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_DEV_OFFICER_CASE", "sage-lead");

    const directory = await loadOfficerDirectory();

    await expect(directory.getMyRecord("officer@acmutd.co")).resolves.toBeNull();
  });

  it("uses the fixture case named by VITE_DEV_OFFICER_CASE in development", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_DEV_OFFICER_CASE", "sage-lead");

    const directory = await loadOfficerDirectory();

    await expect(directory.getMyRecord("officer@acmutd.co")).resolves.toEqual({
      email: "officer@acmutd.co",
      ...FIXTURE_OFFICERS["sage-lead"],
    });
  });

  it("falls back to no record, with a warning, for an unknown case", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_DEV_OFFICER_CASE", "typo");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const directory = await loadOfficerDirectory();

    await expect(directory.getMyRecord("officer@acmutd.co")).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"typo"'));
  });
});
