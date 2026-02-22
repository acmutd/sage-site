const normalizeRawToken = (value: unknown): string =>
  String(value || "")
    .toUpperCase()
    .trim()
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ");

export const normalizeCourseCode = (value: unknown): string => {
  const normalized = normalizeRawToken(value);
  if (!normalized) return "";

  // Canonicalize "CS1337" -> "CS 1337", "CS 1337" -> "CS 1337".
  const subjectNumberMatch = normalized.match(/^([A-Z]+)\s*([0-9][A-Z0-9]*)$/);
  if (subjectNumberMatch) {
    return `${subjectNumberMatch[1]} ${subjectNumberMatch[2]}`;
  }

  // Keep slash-subject tokens canonicalized as "CE/CS 1337".
  const slashSubjectMatch = normalized.match(
    /^([A-Z]+(?:\/[A-Z]+)+)\s*([0-9][A-Z0-9]*)$/
  );
  if (slashSubjectMatch) {
    return `${slashSubjectMatch[1]} ${slashSubjectMatch[2]}`;
  }

  return normalized;
};

const unique = (values: string[]): string[] => [...new Set(values.filter(Boolean))];

const splitPrerequisites = (prereqToken: string): string[] => {
  const normalizedToken = normalizeRawToken(prereqToken);
  if (!normalizedToken) return [];

  const [courseToken] = normalizedToken.split("|");
  const normalizedCourseToken = normalizeRawToken(courseToken);

  // Mimics evaluator behavior:
  // if token contains slash subject form (e.g. CE/CS 1337),
  // expand to OR alternatives (CE 1337, CS 1337).
  if (!normalizedCourseToken.includes("/")) {
    return [normalizeCourseCode(normalizedCourseToken)];
  }

  const prereqArray = normalizedCourseToken.split(" ");
  if (prereqArray.length < 2) {
    return [normalizeCourseCode(normalizedCourseToken)];
  }

  const subjectSegment = prereqArray[0];
  const numberSegment = prereqArray[1];

  return subjectSegment
    .split("/")
    .map((prefix) => normalizeCourseCode(`${prefix} ${numberSegment}`))
    .filter(Boolean);
};

export const parsePrerequisiteGroups = (value: unknown): string[][] => {
  if (!value) return [];

  const res: string[][] = [];

  // Top-level list = AND. Nested list items = OR within that group.
  if (typeof value === "string") {
    const group = unique(splitPrerequisites(value));
    return group.length > 0 ? [group] : [];
  }

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === "string") {
        const group = unique(splitPrerequisites(item));
        if (group.length > 0) res.push(group);
        return;
      }

      if (Array.isArray(item)) {
        const temp: string[] = [];
        item.forEach((subItem) => {
          if (typeof subItem === "string") {
            temp.push(...splitPrerequisites(subItem));
          }
        });
        const group = unique(temp);
        if (group.length > 0) res.push(group);
      }
    });

    return res;
  }

  // Backward compatibility for dict format.
  if (typeof value === "object") {
    Object.keys(value as Record<string, unknown>).forEach((token) => {
      const group = unique(splitPrerequisites(token));
      if (group.length > 0) res.push(group);
    });

    return res;
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
  const normalizedSatisfied = new Set(
    [...satisfiedCourseCodes].map((code) => normalizeCourseCode(code)).filter(Boolean)
  );

  return prerequisiteGroups.filter(
    (group) => !group.some((courseCode) => normalizedSatisfied.has(normalizeCourseCode(courseCode)))
  );
};
