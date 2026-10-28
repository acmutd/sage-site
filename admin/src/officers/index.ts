import { createEmptyOfficerDirectory, type OfficerDirectory } from "./officerDirectory";

export * from "./officerDirectory";

// Set VITE_DEV_OFFICER_CASE to a fixture case to test each tier in development.
// The fixture is imported lazily so production builds drop it.
export async function loadOfficerDirectory(): Promise<OfficerDirectory> {
  if (!import.meta.env.DEV) return createEmptyOfficerDirectory();

  const { DEV_OFFICER_CASES, createFixtureOfficerDirectory, isDevOfficerCase } = await import(
    "./fixtureOfficerDirectory"
  );
  const officerCase = import.meta.env.VITE_DEV_OFFICER_CASE;
  if (isDevOfficerCase(officerCase)) return createFixtureOfficerDirectory(officerCase);

  console.warn(
    `VITE_DEV_OFFICER_CASE is ${officerCase === undefined ? "unset" : `"${officerCase}"`}; ` +
      `every account resolves to "no-record". Use one of: ${DEV_OFFICER_CASES.join(", ")}`,
  );
  return createFixtureOfficerDirectory("no-record");
}
