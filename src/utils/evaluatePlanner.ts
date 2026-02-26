import Cookies from "js-cookie";

function getPlannerState(): any {
  const raw = localStorage.getItem("planner-state");
  if (!raw) throw new Error("No planner state found in localStorage");
  return JSON.parse(raw);
}

type SuggestedCourse = {
  code?: string;
  course_code?: string;
  name?: string;
  course_name?: string;
  [key: string]: any;
};

type SectionSuggestions = Record<string, SuggestedCourse[]>;
type DegreeSuggestions = Record<string, SectionSuggestions>;

type EvaluatePlannerSuggestionsPayload = {
  new_suggestions?: DegreeSuggestions;
  [key: string]: any;
};

type PlannerEvaluationOptions = {
  quickEvaluation?: boolean;
  assumeMinimumGradePass?: boolean;
  plannerStateOverride?: any;
};

function normalizeName(name: string): string {
  return String(name || "").trim().replace(/\s+/g, " ").toUpperCase();
}

function buildSuggestedCourseKey(course: SuggestedCourse): string {
  const code = (course.code || course.course_code || "").trim().toUpperCase();
  if (code) return `code:${code}`;

  const name = (course.name || course.course_name || "").trim().toUpperCase();
  if (name) return `name:${name}`;

  return `raw:${JSON.stringify(course)}`;
}

function mergeSuggestedCourseLists(
  existingSuggested: SuggestedCourse[] = [],
  incomingSuggested: SuggestedCourse[] = []
): SuggestedCourse[] {
  const merged = [...existingSuggested];
  const seen = new Set(existingSuggested.map(buildSuggestedCourseKey));

  incomingSuggested.forEach((course) => {
    const key = buildSuggestedCourseKey(course);
    if (!seen.has(key)) {
      merged.push(course);
      seen.add(key);
    }
  });

  return merged;
}

function buildNormalizedSectionSuggestionsMap(
  sectionSuggestions: SectionSuggestions = {}
): Record<string, SuggestedCourse[]> {
  const normalizedMap: Record<string, SuggestedCourse[]> = {};

  Object.entries(sectionSuggestions).forEach(([sectionName, courses]) => {
    if (!Array.isArray(courses)) return;
    const normalizedSectionName = normalizeName(sectionName);
    normalizedMap[normalizedSectionName] = mergeSuggestedCourseLists(
      normalizedMap[normalizedSectionName] || [],
      courses
    );
  });

  return normalizedMap;
}

function buildGlobalNormalizedSectionSuggestionsMap(
  newSuggestions: DegreeSuggestions = {}
): Record<string, SuggestedCourse[]> {
  const normalizedMap: Record<string, SuggestedCourse[]> = {};

  Object.values(newSuggestions).forEach((sectionSuggestions) => {
    if (!sectionSuggestions || typeof sectionSuggestions !== "object") return;
    const currentDegreeMap = buildNormalizedSectionSuggestionsMap(sectionSuggestions);

    Object.entries(currentDegreeMap).forEach(([sectionName, courses]) => {
      normalizedMap[sectionName] = mergeSuggestedCourseLists(
        normalizedMap[sectionName] || [],
        courses
      );
    });
  });

  return normalizedMap;
}

function resolveDegreeSectionSuggestions(
  newSuggestions: DegreeSuggestions,
  degreeName: string
): SectionSuggestions | undefined {
  const direct = newSuggestions[degreeName];
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    return direct;
  }

  const normalizedDegreeName = normalizeName(degreeName);
  const matchingDegreeEntry = Object.entries(newSuggestions).find(
    ([incomingDegreeName, incomingSectionSuggestions]) =>
      normalizeName(incomingDegreeName) === normalizedDegreeName &&
      incomingSectionSuggestions &&
      typeof incomingSectionSuggestions === "object" &&
      !Array.isArray(incomingSectionSuggestions)
  );

  return matchingDegreeEntry?.[1] as SectionSuggestions | undefined;
}

function extractNewSuggestions(
  evaluatePlannerOutput: EvaluatePlannerSuggestionsPayload = {}
): DegreeSuggestions | undefined {
  if (
    evaluatePlannerOutput.new_suggestions &&
    typeof evaluatePlannerOutput.new_suggestions === "object" &&
    !Array.isArray(evaluatePlannerOutput.new_suggestions)
  ) {
    return evaluatePlannerOutput.new_suggestions;
  }

  const nestedNewSuggestions = evaluatePlannerOutput?.results?.new_suggestions;
  if (
    nestedNewSuggestions &&
    typeof nestedNewSuggestions === "object" &&
    !Array.isArray(nestedNewSuggestions)
  ) {
    return nestedNewSuggestions;
  }

  return undefined;
}

function mergeDegreeCategorySuggestions(
  categories: any[] = [],
  normalizedSectionSuggestions: Record<string, SuggestedCourse[]>
): any[] {
  if (!Array.isArray(categories) || !normalizedSectionSuggestions) {
    return categories;
  }

  return categories.map((category) => {
    const incomingSuggested =
      normalizedSectionSuggestions[normalizeName(category.name || "")];

    const mergedCategory = {
      ...category,
      suggested: Array.isArray(incomingSuggested)
        ? mergeSuggestedCourseLists(category.suggested || [], incomingSuggested)
        : category.suggested,
    };

    if (Array.isArray(category.categories) && category.categories.length > 0) {
      mergedCategory.categories = mergeDegreeCategorySuggestions(
        category.categories,
        normalizedSectionSuggestions
      );
    }

    return mergedCategory;
  });
}

function mergeEvaluatePlannerSuggestions(
  existingRequirements: any[] = [],
  evaluatePlannerOutput: EvaluatePlannerSuggestionsPayload = {}
): any[] {
  if (!Array.isArray(existingRequirements)) return existingRequirements;

  const newSuggestions = extractNewSuggestions(evaluatePlannerOutput);
  if (!newSuggestions || typeof newSuggestions !== "object") {
    return existingRequirements;
  }

  const globalNormalizedSectionSuggestions =
    buildGlobalNormalizedSectionSuggestionsMap(newSuggestions);

  return existingRequirements.map((requirement) => {
    const degreeName = requirement?.degree;
    const degreeSuggestions = degreeName
      ? resolveDegreeSectionSuggestions(newSuggestions, degreeName)
      : undefined;

    const degreeNormalizedSectionSuggestions = buildNormalizedSectionSuggestionsMap(
      degreeSuggestions || {}
    );
    const effectiveNormalizedSectionSuggestions = {
      ...globalNormalizedSectionSuggestions,
      ...degreeNormalizedSectionSuggestions,
    };

    return {
      ...requirement,
      categories: mergeDegreeCategorySuggestions(
        requirement.categories || [],
        effectiveNormalizedSectionSuggestions
      ),
    };
  });
}

function mergeEvaluatePlannerSuggestionsIntoLocalEvaluation(
  evaluatePlannerOutput: EvaluatePlannerSuggestionsPayload = {}
): any[] {
  const rawEvaluation = localStorage.getItem("evaluation");
  if (!rawEvaluation) throw new Error("No evaluation found in localStorage");

  const parsedEvaluation = JSON.parse(rawEvaluation);
  const currentRequirements = Array.isArray(parsedEvaluation)
    ? parsedEvaluation
    : parsedEvaluation?.results || [];

  const mergedRequirements = mergeEvaluatePlannerSuggestions(
    currentRequirements,
    evaluatePlannerOutput
  );

  if (Array.isArray(parsedEvaluation)) {
    localStorage.setItem("evaluation", JSON.stringify(mergedRequirements));
  } else {
    localStorage.setItem(
      "evaluation",
      JSON.stringify({
        ...parsedEvaluation,
        results: mergedRequirements,
      })
    );
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("planner-evaluation-updated", {
        detail: { requirements: mergedRequirements },
      })
    );
  }

  return mergedRequirements;
}

async function requestPlannerEvaluation(
  options: PlannerEvaluationOptions = {}
): Promise<any> {
  const token = Cookies.get("authToken");
  if (!token) throw new Error("No auth token found — are you logged in?");
  const rawTranscript = localStorage.getItem("transcriptData");
  if (!rawTranscript)
    throw new Error("No transcript data found in localStorage");
  const transcriptData = JSON.parse(rawTranscript);
  const id = transcriptData.id;
  if (!id) throw new Error("No account ID found in transcript data");

  const plannerData = options.plannerStateOverride || getPlannerState();
  const activePlan = plannerData.plans.find(
    (p: any) => p.id === plannerData.activePlanId
  );
  if (!activePlan) throw new Error("Active plan not found");

  const plannedCourses = {
    placedCourses: activePlan.placedCourses,
    semesters: activePlan.semesters,
  };
  const isQuickEvaluation = Boolean(options.quickEvaluation);
  const assumeMinimumGradePass = Boolean(options.assumeMinimumGradePass);

  const response = await fetch(import.meta.env.VITE_EVALUATOR_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      plannedCourses,
      token,
      quickEvaluation: isQuickEvaluation,
      quick_evaluation: isQuickEvaluation,
      assumeMinimumGradePass,
      assume_minimum_grade: assumeMinimumGradePass,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Evaluator returned ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data;
}

async function evaluatePlanner(
  options: PlannerEvaluationOptions = {}
): Promise<any> {
  const data = await requestPlannerEvaluation(options);
  const results = data.results ?? data;
  return results;
}

async function evaluatePlannerAndMergeSuggestions(
  options: PlannerEvaluationOptions = {}
): Promise<any[]> {
  const plannerEvaluation = await requestPlannerEvaluation(options);
  return mergeEvaluatePlannerSuggestionsIntoLocalEvaluation(plannerEvaluation);
}

export {
  evaluatePlanner,
  evaluatePlannerAndMergeSuggestions,
  getPlannerState,
  mergeEvaluatePlannerSuggestions,
  mergeEvaluatePlannerSuggestionsIntoLocalEvaluation,
};
