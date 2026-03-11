import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Onboarding from "@/components/planner/Onboarding";
import Planner from "@/components/Planner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { MultiBackend, TouchTransition, MouseTransition } from "react-dnd-multi-backend";
import { useAuth } from "@/context/AuthContext";
import { usePlannerStore } from "@/stores/plannerStore";

type PlanConflictOption = "overwrite" | "select" | "new";

type ConflictCallback = (
  choice: "overwrite" | "select" | "new",
  degrees: any[],
  fetchedData: any,
  targetPlanId?: string
) => void;

interface PlanConflictState {
  pendingFetchedData: any;
  pendingTranscriptData: any;
  newDegrees: any[];
  currentDegrees: any[];
}

const HTML5toTouch = {
  backends: [
    {
      id: 'html5',
      backend: HTML5Backend,
      transition: MouseTransition,
    },
    {
      id: 'touch',
      backend: TouchBackend,
      options: { enableMouseEvents: true },
      preview: true,
      transition: TouchTransition,
    },
  ],
};

const PlannerPage = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [isFirstTime, setFirstTime] = useState(true);
  const [transcriptData, setTranscriptData] = useState<{ id: string; courses?: { utd_classes?: Record<string, any[]> } } | null>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [planConflict, setPlanConflict] = useState<PlanConflictState | null>(null);

  // "select" option — which existing plan to overwrite
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  // existing plan names/ids come from Planner via this ref, populated on register
  const plannerConflictCallbackRef = useRef<ConflictCallback | null>(null) as { current: ConflictCallback | null };
  const planListRef = useRef<{ id: string; name: string }[]>([]) as { current: { id: string; name: string }[] };

  const fetchAbortRef = useRef<AbortController | null>(null);
  const VITE_EVALUATOR_API = import.meta.env.VITE_EVALUATOR_API;
  const { user } = useAuth();

  const parseRequirementsFromEvaluation = (rawEvaluation: string | null): any[] => {
    if (!rawEvaluation) return [];
    const parsed = JSON.parse(rawEvaluation);
    if (Array.isArray(parsed)) return parsed;
    return parsed?.results || [];
  };

  // prevent global scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  // dark navbar during first-time onboarding
  useEffect(() => {
    if (showOnboarding && isFirstTime) {
      document.body.setAttribute('data-onboarding-active', 'true');
    } else {
      document.body.removeAttribute('data-onboarding-active');
    }
    return () => { document.body.removeAttribute('data-onboarding-active'); };
  }, [showOnboarding, isFirstTime]);

  useEffect(() => {
    if (!user) return;
    const initializePlanner = async () => {
      setLoading(true);

      const missingData = !localStorage.getItem('planner-state') || !localStorage.getItem('evaluation');
      if (missingData) sessionStorage.removeItem('hasCheckedCloudThisSession');

      await syncPlannerFromCloud();

      const hasPlannerState = localStorage.getItem('planner-state');
      const hasEvaluation = localStorage.getItem('evaluation');
      const hasTranscriptData = localStorage.getItem('transcriptData');

      if (!hasPlannerState || !hasEvaluation) sessionStorage.removeItem('hasCheckedCloudThisSession');

      if (hasEvaluation) setRequirements(parseRequirementsFromEvaluation(hasEvaluation));
      if (hasTranscriptData) setTranscriptData(JSON.parse(hasTranscriptData));

      if (hasPlannerState && hasEvaluation) {
        setShowPlanner(true);
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
        setShowPlanner(false);
      }

      setLoading(false);
    };

    initializePlanner();
  }, []);

  useEffect(() => {
    const handlePlannerEvaluationUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ requirements?: any[] }>;
      const nextRequirements = customEvent.detail?.requirements;
      if (Array.isArray(nextRequirements)) {
        setRequirements(nextRequirements);
        return;
      }
      const cachedEvaluation = localStorage.getItem("evaluation");
      setRequirements(parseRequirementsFromEvaluation(cachedEvaluation));
    };

    window.addEventListener("planner-evaluation-updated", handlePlannerEvaluationUpdated as EventListener);
    return () => window.removeEventListener("planner-evaluation-updated", handlePlannerEvaluationUpdated as EventListener);
  }, []);

  const syncPlannerFromCloud = async () => {
    const hasCheckedCloud = sessionStorage.getItem('hasCheckedCloudThisSession');
    if (hasCheckedCloud) return;

    if (!user?.uid) {
      sessionStorage.setItem('hasCheckedCloudThisSession', 'true');
      return;
    }

    const token = await user.getIdToken();
    if (!token) {
      sessionStorage.setItem('hasCheckedCloudThisSession', 'true');
      return;
    }

    try {
      const CRUD_API = import.meta.env.VITE_CRUD_API;

      const [plannerResponse, evalResponse, profileResponse] = await Promise.all([
        fetch(CRUD_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.uid, action: 'getPlanner', token }) }),
        fetch(CRUD_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.uid, action: 'getEvaluation', token }) }),
        fetch(CRUD_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.uid, action: 'getProfile', token }) }),
      ]);

      if (plannerResponse.ok) {
        const plannerResult = await plannerResponse.json();
        if (plannerResult.plannerData) {
          const cloudData = plannerResult.plannerData;
          const localDataStr = localStorage.getItem('planner-state');
          if (localDataStr) {
            const localData = JSON.parse(localDataStr);
            if ((cloudData.lastModified || 0) > (localData.lastModified || 0)) {
              localStorage.setItem('planner-state', JSON.stringify(cloudData));
              usePlannerStore.getState().syncFromCloud({
                plans: cloudData.plans,
                activePlanId: cloudData.activePlanId
              });
            }
          } else {
            localStorage.setItem('planner-state', JSON.stringify(cloudData));
            usePlannerStore.getState().syncFromCloud({
              plans: cloudData.plans,
              activePlanId: cloudData.activePlanId
            });
          }
        }
        if (!localStorage.getItem('transcriptData') && plannerResult.transcript_data) {
          localStorage.setItem('transcriptData', JSON.stringify(plannerResult.transcript_data));
        }
      }

      if (evalResponse.ok) {
        const evalResult = await evalResponse.json();
        if (evalResult.evaluation) localStorage.setItem('evaluation', JSON.stringify(evalResult.evaluation));
      }

      if (profileResponse.ok) {
        const profileResult = await profileResponse.json();
        if (profileResult.profile?.['system-fields']?.hasSeenPlannerTutorial === true) {
          localStorage.setItem('hasSeenPlannerTutorial', 'true');
        }
      }
    } catch (error) {
      console.error('Cloud sync failed, using local data:', error);
    } finally {
      sessionStorage.setItem('hasCheckedCloudThisSession', 'true');
    }
  };

  // writes evaluation + transcript to state/localStorage — Planner owns planner-state
  const applyEvaluation = (fetchedData: any, newTranscriptData: any, degrees: any[]) => {
    setRequirements(degrees);
    setTranscriptData(newTranscriptData);
    localStorage.setItem("evaluation", JSON.stringify(fetchedData));
    localStorage.setItem("transcriptData", JSON.stringify(newTranscriptData));
  };

  const fetchRequirements = useCallback(async (transcriptData: any) => {
    try {
      if (!user?.uid) return;

      if (fetchAbortRef.current) fetchAbortRef.current.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      const token = await user.getIdToken();
      if (!token) throw new Error("Failed to retrieve auth token.");
      
      console.log("transcript going into evaluator", transcriptData);

      const response = await fetch(VITE_EVALUATOR_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: transcriptData?.id || "student123", transcriptData, token }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Error: ${response.status}`);

      const fetchedData = await response.json();
      const newDegrees: any[] = fetchedData.results || [];

      const prevEvalRaw = localStorage.getItem("evaluation");
      const prevDegrees: any[] = prevEvalRaw ? JSON.parse(prevEvalRaw)?.results || [] : [];
      const hasExistingPlan = !!localStorage.getItem("evaluation");

      // existing plan...
      if (hasExistingPlan) {
        // default "select" target to first available plan
        const firstPlan = planListRef.current[0];
        setSelectedPlanId(firstPlan?.id ?? "");
        setPlanConflict({
          pendingFetchedData: fetchedData,
          pendingTranscriptData: transcriptData,
          newDegrees,
          currentDegrees: prevDegrees,
        });
        return;
      }

      // no conflict → write directly
      applyEvaluation(fetchedData, transcriptData, newDegrees);
      plannerConflictCallbackRef.current?.("overwrite", newDegrees, fetchedData);

    } catch (error: any) {
      if (error.name === "AbortError") return;
      console.error("Failed to fetch requirements:", error);
    }
  }, [user, VITE_EVALUATOR_API]);

  const handlePlanConflictChoice = (choice: PlanConflictOption) => {
    if (!planConflict) return;
    const { pendingFetchedData, pendingTranscriptData, newDegrees } = planConflict;

    if (choice === "overwrite") {
      // active plan gets the new transcript
      applyEvaluation(pendingFetchedData, pendingTranscriptData, newDegrees);
      plannerConflictCallbackRef.current?.("overwrite", newDegrees, pendingFetchedData);

    } else if (choice === "select") {
      // user-chosen existing plan gets the new transcript, view switches to it
      applyEvaluation(pendingFetchedData, pendingTranscriptData, newDegrees);
      plannerConflictCallbackRef.current?.("select", newDegrees, pendingFetchedData, selectedPlanId);

    } else if (choice === "new") {
      // keep all existing plans, add a brand new one with new transcript
      applyEvaluation(pendingFetchedData, pendingTranscriptData, newDegrees);
      plannerConflictCallbackRef.current?.("new", newDegrees, pendingFetchedData);
    }

    setPlanConflict(null);
    setShowPlanner(true);
  };

  const handleFinishOnboarding = async (data: any) => {
    setShowOnboarding(false);
    setTranscriptData(data);

    if (isFirstTime) {
      setLoading(true);
      await fetchRequirements(data);
      setLoading(false);
      setShowPlanner(true);
    } else {
      await fetchRequirements(data);
      setShowPlanner(true);
    }
  };

  const handleRestartOnboarding = async () => {
    setShowOnboarding(true);
    setFirstTime(false);
  };

  const handleOnboardingCancel = async () => {
    setShowPlanner(true);
    setShowOnboarding(false);
  };

  const rawSemesters: Record<string, any[]> = transcriptData?.courses?.utd_classes || {};

  const transformSemesters = (semesters: Record<string, any[]>) => {
    const academicYears: Record<string, any[]> = {};
    let yearCounter = 1;

    const sortedSemesters = Object.entries(semesters)
      .map(([term, courses]) => {
        const [year, season] = term.split(" ");
        return { year: parseInt(year), season, courses, term };
      })
      .sort((a, b) => {
        const seasonOrder = { Fall: 0, Spring: 1, Summer: 2 };
        if (a.year === b.year) {
          return seasonOrder[a.season as keyof typeof seasonOrder] - seasonOrder[b.season as keyof typeof seasonOrder];
        }
        return a.year - b.year;
      });

    if (sortedSemesters.length === 0) return {};

    let currentYearKey = "";

    for (const semester of sortedSemesters) {
      if (semester.season === "Fall") {
        currentYearKey = `year${yearCounter}`;
        if (!academicYears[currentYearKey]) academicYears[currentYearKey] = [];
        academicYears[currentYearKey].push({ title: `${semester.season} ${semester.year}`, courses: semester.courses });
        yearCounter++;
      }
    }

    for (const semester of sortedSemesters) {
      if (semester.season !== "Fall") {
        let assigned = false;
        for (let i = 1; i < yearCounter; i++) {
          const yearKey = `year${i}`;
          const fallSemester = academicYears[yearKey][0];
          if (fallSemester) {
            const fallYear = parseInt(fallSemester.title.split(" ")[1]);
            if (semester.year === fallYear + 1 && (semester.season === "Spring" || semester.season === "Summer")) {
              academicYears[yearKey].push({ title: `${semester.season} ${semester.year}`, courses: semester.courses });
              assigned = true;
              break;
            }
          }
        }
        if (!assigned) {
          const newYearKey = `year${yearCounter}`;
          if (!academicYears[newYearKey]) academicYears[newYearKey] = [];
          academicYears[newYearKey].push({ title: `${semester.season} ${semester.year}`, courses: semester.courses });
          yearCounter++;
        }
      }
    }

    Object.keys(academicYears).forEach(yearKey => {
      academicYears[yearKey].forEach((semester, semIdx) => {
        semester.courses = semester.courses.map((course: any, index: number) => {
          if (!course.id) {
            const courseCode = course.course_code || course.code || 'unknown';
            course.id = `${yearKey}-${semester.title}-${courseCode}-${semIdx}-${index}`;
          }
          return course;
        });
      });
    });

    return academicYears;
  };

  const transformedSemesters = useMemo(() => {
    return transformSemesters(rawSemesters);
  }, [rawSemesters, transcriptData]);

  return (
    <div className="bg-gray-50">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center justify-center">
            <img src="sage-icon.png" alt="Loading" className="h-16 w-16 animate-spin" />
            <p className="mt-4 opacity-80 font-semibold">Loading...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Conflict resolution modal */}
          {planConflict && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] px-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-4">
                <h2 className="text-lg font-bold text-gray-900">Program Plan Conflict?</h2>
                <p className="text-sm text-gray-500">
                  Your new transcript has different degrees, programs, and/or courses. What would you like to do?
                </p>

                {/* Overwrite: always shown — replaces active plan */}
                <button
                  onClick={() => handlePlanConflictChoice("overwrite")}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  <p className="font-semibold text-gray-800">Overwrite current plan</p>
                  <p className="text-xs text-gray-400 mt-0.5">Replace your active plan with the new transcript</p>
                </button>

                {/* Select: only if user has more than one plan to choose from */}
                {planListRef.current.length > 1 && (
                  <div className="flex flex-col gap-2 px-4 py-3 rounded-xl border border-gray-200">
                    <p className="font-semibold text-gray-800">Apply to a specific plan</p>
                    <p className="text-xs text-gray-400">Pick which of your existing plans to overwrite</p>
                    <select
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      {planListRef.current.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handlePlanConflictChoice("select")}
                      className="mt-1 w-full px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold transition"
                    >
                      Apply to this plan
                    </button>
                  </div>
                )}

                {/* New: always shown — keeps all existing, adds fresh plan */}
                <button
                  onClick={() => handlePlanConflictChoice("new")}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50 transition"
                >
                  <p className="font-semibold text-gray-800">Save current & switch to new plan</p>
                  <p className="text-xs text-gray-400 mt-0.5">All your existing plans stay. A fresh plan opens with the new transcript.</p>
                </button>

                <button
                  onClick={() => setPlanConflict(null)}
                  className="text-sm text-gray-400 hover:text-gray-600 text-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <DndProvider backend={MultiBackend} options={HTML5toTouch}>
            <div>
              {showOnboarding && isFirstTime && (
                <Onboarding
                  onClose={handleOnboardingCancel}
                  onFinish={handleFinishOnboarding}
                  setTranscriptData={setTranscriptData}
                  isFirstTime={true}
                  initialStep="FileUpload"
                  transcriptData={transcriptData}
                />
              )}

              {showPlanner && (
                <Planner
                  semesters={transformedSemesters}
                  requirements={requirements}
                  transcriptData={transcriptData}
                  onRestartOnboarding={handleRestartOnboarding}
                  onRegisterConflictHandler={(cb, plans) => {
                    plannerConflictCallbackRef.current = cb;
                    // keep a live copy of plan list for the modal dropdown
                    planListRef.current = plans;
                  }}
                />
              )}

              {showOnboarding && !isFirstTime && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] px-4">
                  <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
                    <Onboarding
                      onClose={handleOnboardingCancel}
                      onFinish={handleFinishOnboarding}
                      setTranscriptData={setTranscriptData}
                      isFirstTime={false}
                      initialStep="Programs"
                      transcriptData={transcriptData}
                    />
                  </div>
                </div>
              )}
            </div>
          </DndProvider>
        </>
      )}
    </div>
  );
};

export default PlannerPage;