import { ADMIN_POSITIONS, PLACEHOLDER_SAGE_TEAM } from "@/access/tierRules";
import type { OfficerDirectory, OfficerRecord } from "./officerDirectory";

const [SAGE_LEAD_TITLE, DIRECTOR_OF_DEVELOPMENT_TITLE, EXEC_TITLE] = ADMIN_POSITIONS;

// Development only. Records reference the placeholder rules, so they follow when the real titles land.
// null is the "no record" case.
export const FIXTURE_OFFICERS = {
  "non-sage-officer": { team: "TODO_OTHER_ACM_TEAM", position: "TODO_OFFICER_TITLE" },
  "sage-officer": { team: PLACEHOLDER_SAGE_TEAM, position: "TODO_OFFICER_TITLE" },
  "sage-lead": { team: PLACEHOLDER_SAGE_TEAM, position: SAGE_LEAD_TITLE },
  "director-of-development": { team: "TODO_DEVELOPMENT_TEAM", position: DIRECTOR_OF_DEVELOPMENT_TITLE },
  exec: { team: "TODO_EXEC_TEAM", position: EXEC_TITLE },
  "no-record": null,
} satisfies Record<string, Omit<OfficerRecord, "email"> | null>;

export type DevOfficerCase = keyof typeof FIXTURE_OFFICERS;

export const DEV_OFFICER_CASES = Object.keys(FIXTURE_OFFICERS) as DevOfficerCase[];

export function isDevOfficerCase(value: unknown): value is DevOfficerCase {
  return DEV_OFFICER_CASES.some((name) => name === value);
}

// Answers with the chosen case for whichever account signs in, so one real account can test every tier.
export function createFixtureOfficerDirectory(officerCase: DevOfficerCase): OfficerDirectory {
  return {
    async getMyRecord(email) {
      const record = FIXTURE_OFFICERS[officerCase];
      return record && { email, ...record };
    },
  };
}
