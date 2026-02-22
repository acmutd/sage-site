export const normalizeCourseCode = (value: unknown): string =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

const stripGradeRequirement = (token: string): string => {
  return token.split("|")[0].trim();
};

const expandCourseToken = (token: string): string[] => {
  const withoutGrade = normalizeCourseCode(stripGradeRequirement(token));
  if (!withoutGrade) return [];

  // Handles "CS 3345", "CS/SE 3345", and slash+grade variants (grade removed above).
  const match = withoutGrade.match(/^([A-Z]+(?:\/[A-Z]+)*)\s+([0-9][A-Z0-9]*)$/);
  if (!match) return [withoutGrade];

  const subjects = match[1]
    .split("/")
    .map((subject) => subject.trim())
    .filter(Boolean);
  const number = match[2].trim();

  if (subjects.length === 0) return [withoutGrade];
  return subjects.map((subject) => normalizeCourseCode(`${subject} ${number}`));
};

const unique = (values: string[]): string[] => [...new Set(values)];

const normalizeGroupItem = (item: unknown): string[] => {
  if (Array.isArray(item)) {
    return unique(
      item
        .flatMap((value) => expandCourseToken(String(value || "")))
        .filter(Boolean)
    );
  }

  return unique(expandCourseToken(String(item || "")).filter(Boolean));
};

export const parsePrerequisiteGroups = (value: unknown): string[][] => {
  if (!value) return [];

  // Top-level list = AND groups. Nested list item = OR alternatives within that group.
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeGroupItem(item))
      .filter((group) => group.length > 0);
  }

  // Backward compatibility for object shape: treat keys as AND requirements.
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .map((token) => unique(expandCourseToken(token)))
      .filter((group) => group.length > 0);
  }

  if (typeof value === "string") {
    const group = unique(expandCourseToken(value));
    return group.length > 0 ? [group] : [];
  }

  return [];
};

export const getCoursePrerequisiteValue = (course: any): unknown => {
  if (!course || typeof course !== "object") return undefined;

  // New canonical field.
  if (Object.prototype.hasOwnProperty.call(course, "Pre-Requisite")) {
    return course["Pre-Requisite"];
  }

  // Backward compatibility with older payloads.
  return (
    course.prerequisites ??
    course.prerequisite ??
    course.pre_requisite ??
    course["pre-requisite"]
  );
};

export const getCoursePrerequisiteGroups = (course: any): string[][] => {
  return parsePrerequisiteGroups(getCoursePrerequisiteValue(course));
};

export const getMissingPrerequisiteGroups = (
  prerequisiteGroups: string[][],
  satisfiedCourseCodes: Set<string>
): string[][] => {
  return prerequisiteGroups.filter(
    (group) =>
      !group.some((courseCode) =>
        satisfiedCourseCodes.has(normalizeCourseCode(courseCode))
      )
  );
};
