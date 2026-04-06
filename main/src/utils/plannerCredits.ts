import { normalizeCourseCode } from "@/utils/prerequisiteUtils";

export interface CreditsBreakdown {
  completed: number;
  inProgress: number;
  planned: number;
}

/** Default credits when 2nd char of 2nd part is not a digit. */
const DEFAULT_CREDITS = 3;

/**
 * Extract credit hours from a course code.
 * Rule: split by " ", take 2nd part, use 2nd character as credits if it's a digit.
 * E.g. "SE 4347" -> 3 credit hours. If 2nd char is a letter, default to 3.
 */
export function getCreditsFromCourseCode(courseCode: string | undefined | null): number {
  const code = String(courseCode ?? "").trim();
  const parts = code.split(/\s+/);
  const secondPart = parts[1];
  if (!secondPart || secondPart.length < 2) return DEFAULT_CREDITS;
  const secondChar = secondPart[1];
  if (secondChar >= "0" && secondChar <= "9") return Number(secondChar);
  return DEFAULT_CREDITS;
}

/**
 * Extract credit hours from a course object using its code.
 */
export function getCourseCredits(course: any): number {
  const code = course?.code ?? course?.course_code;
  return getCreditsFromCourseCode(code);
}

/**
 * Collect all suggested course codes for a category and its descendants (normalized).
 */
function getSuggestedCourseCodesForCategory(category: any): Set<string> {
  const codes = new Set<string>();
  if (!category) return codes;

  if (Array.isArray(category.suggested)) {
    category.suggested.forEach((c: any) => {
      const code = normalizeCourseCode(c.code ?? c.course_code);
      if (code) codes.add(code);
    });
  }
  if (Array.isArray(category.categories)) {
    category.categories.forEach((sub: any) => {
      getSuggestedCourseCodesForCategory(sub).forEach((code) => codes.add(code));
    });
  }
  return codes;
}

/**
 * Sum credits from category.classes by status.
 */
function sumCreditsByStatus(
  classes: any[] | undefined,
  statusFilter: string
): number {
  if (!Array.isArray(classes)) return 0;
  return classes
    .filter((c: any) => String(c.status ?? "").toLowerCase() === statusFilter)
    .reduce((sum: number, c: any) => sum + getCourseCredits(c), 0);
}

/** Semesters shape: record of year key → array of { courses?: any[] } (same as planner state). */
export type SemestersForCredits = Record<string, Array<{ courses?: any[] }>>;

/**
 * Compute planned credits for a category by iterating semesters on the fly (same pattern as
 * courseValidation totalCredits). Only counts courses with status "planned" whose code is
 * in the category's suggested list.
 */
function getPlannedCreditsFromSemesters(
  category: any,
  semesters: SemestersForCredits
): number {
  const suggestedCodes = getSuggestedCourseCodesForCategory(category);
  let planned = 0;
  Object.values(semesters || {}).forEach((yearSemesters) => {
    (yearSemesters || []).forEach((semester) => {
      (semester.courses || []).forEach((course: any) => {
        if (String(course.status ?? "").toLowerCase() !== "planned") return;
        const code = normalizeCourseCode(course.code ?? course.course_code);
        if (!code || !suggestedCodes.has(code)) return;
        planned += getCourseCredits(course);
      });
    });
  });
  return planned;
}

/**
 * Compute completed, in progress, and planned credit hours for a requirement category.
 * Planned is calculated on the fly from semesters (like semester credit total in courseValidation).
 */
export function getCreditsBreakdownForCategory(
  category: any,
  semesters: SemestersForCredits
): CreditsBreakdown {
  let completed = sumCreditsByStatus(category?.classes, "completed");
  const inProgress = sumCreditsByStatus(category?.classes, "in progress");
  if (completed === 0 && inProgress === 0 && category?.progress != null && category?.progress > 0) {
    completed = Number(category.progress) || 0;
  }
  const planned = getPlannedCreditsFromSemesters(category, semesters);
  return { completed, inProgress, planned };
}

/**
 * Recursively aggregate credits breakdown for a requirement (degree) or category
 * that has nested categories. Planned is computed on the fly from semesters.
 */
export function getCreditsBreakdownRecursive(
  categoryOrRequirement: any,
  semesters: SemestersForCredits
): CreditsBreakdown {
  const self = getCreditsBreakdownForCategory(categoryOrRequirement, semesters);
  const subcats = categoryOrRequirement?.categories;
  if (!Array.isArray(subcats) || subcats.length === 0) return self;
  return subcats.reduce<CreditsBreakdown>(
    (acc, sub) => {
      const subBreakdown = getCreditsBreakdownRecursive(sub, semesters);
      return {
        completed: acc.completed + subBreakdown.completed,
        inProgress: acc.inProgress + subBreakdown.inProgress,
        planned: acc.planned + subBreakdown.planned,
      };
    },
    { ...self }
  );
}

function hasDirectCourses(category: any): boolean {
  return !!(category?.classes?.length || category?.suggested?.length);
}

/**
 * Result of getCompletionForCategory: completed/total to display, and whether
 * this section uses credit hours (vs subsection count).
 */
export interface CompletionResult {
  completed: number;
  total: number;
  /** If false, display is "N/M subsections completed" style */
  isCreditBased: boolean;
}

/**
 * Compute completion for a category. If the section has direct courses (classes
 * or suggested), use credit-based completion. If not, use recursive subsection
 * count: completed = # of subsections where numerator >= denominator.
 */
export function getCompletionForCategory(
  category: any,
  semesters: SemestersForCredits
): CompletionResult {
  const subcats = category?.categories;

  if (hasDirectCourses(category)) {
    const breakdown = getCreditsBreakdownForCategory(category, semesters);
    const total = Number(category?.total) || 0;
    const completed =
      breakdown.completed + breakdown.inProgress + breakdown.planned;
    return { completed, total, isCreditBased: true };
  }

  if (!Array.isArray(subcats) || subcats.length === 0) {
    return { completed: 0, total: 0, isCreditBased: false };
  }

  let completedCount = 0;
  for (const sub of subcats) {
    const subResult = getCompletionForCategory(sub, semesters);
    if (subResult.total > 0 && subResult.completed >= subResult.total) {
      completedCount++;
    }
  }
  return {
    completed: completedCount,
    total: subcats.length,
    isCreditBased: false,
  };
}
