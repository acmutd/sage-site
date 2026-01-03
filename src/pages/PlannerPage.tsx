import { useEffect, useMemo, useState } from "react";
import Onboarding from "@/components/Onboarding";
import Planner from "@/components/Planner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const PlannerPage = () => {
  const [showOnboarding, setShowOnboarding] = useState(true); // Initially show onboarding
  const [showPlanner, setShowPlanner] = useState(false); // Initially hide planner
  const [transcriptData, setTranscriptData] = useState<{ id: string; courses?: { utd_classes?: Record<string, any[]> } } | null>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false); // Track loading state
  const VITE_EVALUATOR_API = import.meta.env.VITE_EVALUATOR_API;

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
  }, [showOnboarding]);
  
  const handleFinishOnboarding = async (data: any) => {
    setShowOnboarding(false); // Close the onboarding modal
    setTranscriptData(data);
    setLoading(true); // Start loading
    await fetchRequirements(data);
    setLoading(false); // Stop loading
    setShowPlanner(true); // Show the Planner component

  };

  const rawSemesters: Record<string, any[]> = transcriptData?.courses?.utd_classes || {};
  console.log(rawSemesters)
  const user_id = transcriptData?.['id'] || 'unknown_student';

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
  }, [rawSemesters]);

  console.log(transformedSemesters);
  console.log(user_id);
  console.log(transcriptData)

  const fetchRequirements = async (transcriptData: any) => {
    try {
      const response = await fetch(
        VITE_EVALUATOR_API,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          //body: JSON.stringify({ id: transcriptData?.id || "student123" }),
          //body: JSON.stringify({ id: "student123" }),
          //body: JSON.stringify({ id: "student123", transcriptData: transcriptData }), // For testing with full transcript
          body: JSON.stringify({ id: transcriptData?.id || "student123", transcriptData: transcriptData }), // For testing with full transcript

        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const fetchedData = await response.json();
      console.log("Requirements fetched:", fetchedData);
      const degrees = fetchedData.results || []; // Ensure it's an array
      setRequirements(degrees);
    } catch (error) {
      console.error("Failed to fetch requirements:", error);
    }
  };

  return (
    <div className="bg-gray-50 p-6">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center justify-center">
            <img 
              src="sage-icon.png" 
              alt="Loading" 
              className="h-16 w-16 animate-spin"
            />
            <p className="mt-4 text-[#85EA90] opacity-80 font-semibold">Loading...</p>
          </div>
        </div>
      ) : (
        <>
          <DndProvider backend={HTML5Backend}>
            <div>
              {showOnboarding && (
                <Onboarding
                  onClose={() => setShowOnboarding(false)}
                  onFinish={handleFinishOnboarding}
                  setTranscriptData={setTranscriptData}

                />
              )}
              {showPlanner && <Planner semesters={transformedSemesters} requirements={requirements} transcriptData={transcriptData} />}
            </div>
          </DndProvider>
        </>
      )}
    </div>
  );
};

export default PlannerPage;
