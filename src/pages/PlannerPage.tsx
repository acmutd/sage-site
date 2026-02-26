import { useEffect, useMemo, useState } from "react";
import Onboarding from "@/components/Onboarding";
import Planner from "@/components/Planner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { MultiBackend, TouchTransition, MouseTransition } from "react-dnd-multi-backend";
import { useAuth } from "@/context/AuthContext";
import Cookies from "js-cookie";

// tablet mode 
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
  const [showOnboarding, setShowOnboarding] = useState(false); // Initially show onboarding
  const [showPlanner, setShowPlanner] = useState(false); // Initially hide planner
  const [isFirstTime, setFirstTime] = useState(true);
  const [transcriptData, setTranscriptData] = useState<{ id: string; courses?: { utd_classes?: Record<string, any[]> } } | null>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); // Track loading state
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
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // invoke dark navbar when we're at program spec pipeline
  useEffect(() => {
    if (showOnboarding) {
      document.body.setAttribute('data-onboarding-active', 'true');
    } else {
      document.body.removeAttribute('data-onboarding-active');
    }

    // unmounting component
    return () => {
      document.body.removeAttribute('data-onboarding-active');
    };
  }, [showOnboarding]);
  
  useEffect(() => {
    const initializePlanner = async () => {
      setLoading(true);
      
      await syncPlannerFromCloud();
      
      const hasPlannerState = localStorage.getItem('planner-state');
      const hasEvaluation = localStorage.getItem('evaluation');
      
      if (hasEvaluation) {
        setRequirements(parseRequirementsFromEvaluation(hasEvaluation));
      }

      
      
      if (hasPlannerState && hasEvaluation) {
        // Load evaluation and show planner
        setShowPlanner(true);
        setShowOnboarding(false);
      } else {
        // Missing planner or evaluation, show onboarding
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

    window.addEventListener(
      "planner-evaluation-updated",
      handlePlannerEvaluationUpdated as EventListener
    );

    return () => {
      window.removeEventListener(
        "planner-evaluation-updated",
        handlePlannerEvaluationUpdated as EventListener
      );
    };
  }, []);

  const syncPlannerFromCloud = async () => {
    // Check if we've already synced this browser session
    const hasCheckedCloud = sessionStorage.getItem('hasCheckedCloudThisSession');
    if (hasCheckedCloud) return;

    if (!user?.uid) {
      sessionStorage.setItem('hasCheckedCloudThisSession', 'true');
      return;
    }

    const token = Cookies.get('authToken');
    if (!token) {
      sessionStorage.setItem('hasCheckedCloudThisSession', 'true');
      return;
    }

    try {
      const CRUD_API = import.meta.env.VITE_CRUD_API;
      
      // Fetch planner, evaluation, and profile in parallel
      const [plannerResponse, evalResponse, profileResponse] = await Promise.all([
        fetch(CRUD_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            action: 'getPlanner',
            token,
          }),
        }),
        fetch(CRUD_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            action: 'getEvaluation',
            token,
          }),
        }),
        fetch(CRUD_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            action: 'getProfile',
            token,
          }),
        }),
      ]);

      // Handle planner data
      if (plannerResponse.ok) {
        const plannerResult = await plannerResponse.json();
        
        if (plannerResult.plannerData) {
          const cloudData = plannerResult.plannerData;
          const localDataStr = localStorage.getItem('planner-state');
          
          if (localDataStr) {
            const localData = JSON.parse(localDataStr);
            const cloudTimestamp = cloudData.lastModified || 0;
            const localTimestamp = localData.lastModified || 0;

            if (cloudTimestamp > localTimestamp) {
              localStorage.setItem('planner-state', JSON.stringify(cloudData));
            }
          } else {
            localStorage.setItem('planner-state', JSON.stringify(cloudData));
          }
        }
      }

      // Handle evaluation data
      if (evalResponse.ok) {
        const evalResult = await evalResponse.json();
        
        if (evalResult.evaluation) {
          localStorage.setItem('evaluation', JSON.stringify(evalResult.evaluation));

          console.log('Synced evaluation from cloud');
        }
      }

      // Handle profile data and sync tutorial status
      if (profileResponse.ok) {
        const profileResult = await profileResponse.json();

        console.log('ok')
        
        if (profileResult.profile) {
          console.log('ok')
          const hasSeenTutorial = profileResult.profile?.['system-fields']?.hasSeenPlannerTutorial;
          console.log(hasSeenTutorial)     
          if (hasSeenTutorial === true) {
            localStorage.setItem('hasSeenPlannerTutorial', 'true');
          }
        }
      }

    } catch (error) {
      console.error('Cloud sync failed, using local data:', error);
    } finally {
      sessionStorage.setItem('hasCheckedCloudThisSession', 'true');
    }
  };
  
  

  const handleFinishOnboarding = async (data: any) => {
    setShowOnboarding(false); // Close the onboarding modal
    setTranscriptData(data);
    setLoading(true); // Start loading
    await fetchRequirements(data);
    setLoading(false); // Stop loading
    setShowPlanner(true); // Show the Planner component

  };

  const handleRestartOnboarding = async () => {
    setShowPlanner(false);
    setShowOnboarding(true);
    setFirstTime(false);
  }

  const handleOnboardingCancel = async () => {
    setShowPlanner(true);
    setShowOnboarding(false);
  }

  const rawSemesters: Record<string, any[]> = transcriptData?.courses?.utd_classes || {};

  const transformSemesters = (semesters: Record<string, any[]>) => {
    // Create a map to track academic years
    const academicYears: Record<string, any[]> = {};
    let yearCounter = 1;

    // Extract and sort semesters chronologically
    const sortedSemesters = Object.entries(semesters)
      .map(([term, courses]) => {
        const [year, season] = term.split(" ");
        return {
          year: parseInt(year),
          season,
          courses,
          term // Keep the original term string
        };
      })
      .sort((a, b) => {
        // Sort by year first, then by season (Fall -> Spring -> Summer)
        const seasonOrder = { Fall: 0, Spring: 1, Summer: 2 };
        if (a.year === b.year) {
          return seasonOrder[a.season as keyof typeof seasonOrder] - seasonOrder[b.season as keyof typeof seasonOrder];
        }
        return a.year - b.year;
      });

    // If no semesters, return empty object
    if (sortedSemesters.length === 0) return {};

    // Process Fall semesters first to establish academic years
    let currentYearKey = "";

    // First pass: Process Fall semesters and assign them to academic years
    for (const semester of sortedSemesters) {
      if (semester.season === "Fall") {
        currentYearKey = `year${yearCounter}`;

        if (!academicYears[currentYearKey]) {
          academicYears[currentYearKey] = [];
        }

        academicYears[currentYearKey].push({
          title: `${semester.season} ${semester.year}`,
          courses: semester.courses
        });

        yearCounter++;
      }
    }

    // Second pass: Assign Spring and Summer semesters to the appropriate academic year
    for (const semester of sortedSemesters) {
      if (semester.season !== "Fall") {
        // Find the appropriate Fall semester for this Spring/Summer
        let assigned = false;

        for (let i = 1; i < yearCounter; i++) {
          const yearKey = `year${i}`;
          const fallSemester = academicYears[yearKey][0];

          if (fallSemester) {
            const fallYear = parseInt(fallSemester.title.split(" ")[1]);

            // If this Spring/Summer follows the Fall semester
            if (semester.year === fallYear + 1 &&
              (semester.season === "Spring" || semester.season === "Summer")) {
              academicYears[yearKey].push({
                title: `${semester.season} ${semester.year}`,
                courses: semester.courses
              });
              assigned = true;
              break;
            }
          }
        }

        // If not assigned to any existing year, create a new year for it
        if (!assigned) {
          const newYearKey = `year${yearCounter}`;

          if (!academicYears[newYearKey]) {
            academicYears[newYearKey] = [];
          }

          academicYears[newYearKey].push({
            title: `${semester.season} ${semester.year}`,
            courses: semester.courses
          });

          yearCounter++;
        }
      }
    }

    // Add unique IDs to courses - ensure they're truly unique and stable
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

  const fetchRequirements = async (transcriptData: any) => {
    try {

      if (!user?.uid) {
        console.warn("User ID is missing; cannot proceed further!");
        return;
      }
      
      const token = await user.getIdToken();
      if (!token) throw new Error("Failed to retrieve authentication token.");

      const response = await fetch(VITE_EVALUATOR_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: transcriptData?.id || "student123", 
          transcriptData: transcriptData,
          token
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
  
      const fetchedData = await response.json();
      const degrees = fetchedData.results || [];
      setRequirements(degrees);

      localStorage.setItem('evaluation', JSON.stringify(fetchedData));
      localStorage.setItem('transcriptData', JSON.stringify(transcriptData));
    } catch (error) {
      console.error("Failed to fetch requirements:", error);
    }
  };

  return (
    <div className="bg-gray-50">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center justify-center">
            <img 
              src="sage-icon.png" 
              alt="Loading" 
              className="h-16 w-16 animate-spin"
            />
            <p className="mt-4 opacity-80 font-semibold">Loading...</p>
          </div>
        </div>
      ) : (
        <>
          <DndProvider backend={MultiBackend} options={HTML5toTouch}>
            <div>
              {showOnboarding && (
                <Onboarding
                  onClose={handleOnboardingCancel}
                  onFinish={handleFinishOnboarding}
                  setTranscriptData={setTranscriptData}
                  isFirstTime={isFirstTime}
                  initialStep={isFirstTime ? "FileUpload" : "Programs"}
                  transcriptData={transcriptData}
                />
              )}
              {showPlanner && (
                <Planner 
                  semesters={transformedSemesters} 
                  requirements={requirements} 
                  transcriptData={transcriptData}
                  onRestartOnboarding={handleRestartOnboarding}
                />
              )}
            </div>
          </DndProvider>
        </>
      )}
    </div>
  );
};

export default PlannerPage;
