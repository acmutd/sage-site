import Cookies from "js-cookie";

function getPlannerState(): any {
  const raw = localStorage.getItem("planner-state");
  if (!raw) throw new Error("No planner state found in localStorage");
  return JSON.parse(raw);
}

async function evaluatePlanner(): Promise<any> {
  const token = Cookies.get("authToken");
  if (!token) throw new Error("No auth token found — are you logged in?");

  const rawTranscript = localStorage.getItem("transcriptData");
  if (!rawTranscript)
    throw new Error("No transcript data found in localStorage");
  const transcriptData = JSON.parse(rawTranscript);
  const id = transcriptData.id;
  if (!id) throw new Error("No account ID found in transcript data");

  const plannerData = getPlannerState();
  const activePlan = plannerData.plans.find(
    (p: any) => p.id === plannerData.activePlanId
  );
  if (!activePlan) throw new Error("Active plan not found");

  const plannedCourses = {
    placedCourses: activePlan.placedCourses,
    semesters: activePlan.semesters,
  };
  console.log("Sending active plan to evaluator...", plannedCourses);

  const response = await fetch(import.meta.env.VITE_EVALUATOR_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, plannedCourses, token }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Evaluator returned ${response.status}: ${text}`);
  }

  const data = await response.json();

  const results = data.results ?? data;
  console.log("Evaluator response:", JSON.stringify(results, null, 2));
  return results;
}

if (import.meta.env.DEV) {
  (window as any).evaluatePlanner = evaluatePlanner;
  (window as any).getPlannerState = getPlannerState;
}

export { evaluatePlanner, getPlannerState };
