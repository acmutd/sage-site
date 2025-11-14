import { useMemo, useState } from "react";
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
        "https://tdv6ry29ob.execute-api.us-east-2.amazonaws.com/sage-development/planEvaluator",
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

  // const requirements = [
  //   {
  //     "degree": "Core Requirements",
  //     "progress": 3,
  //     "total": 9,
  //     "credits_completed": 19,
  //     "credits": 42,
  //     "categories": [
  //       {
  //         "name": "Communication: 6 semester credit hours",
  //         "progress": 3,
  //         "total": 6,
  //         "credits_completed": 3,
  //         "credits": 6,
  //         "classes": [
  //           {
  //             "code": "RHET 1302",
  //             "name": "RHETORIC",
  //             "credits": 3.0,
  //             "status": "completed",
  //             "semester": "2024 Fall"
  //           }
  //         ],
  //         "categories": [],
  //         "suggested": [
  //           "ECS 2390"
  //         ]
  //       },
  //       {
  //         "name": "Mathematics: 3 semester credit hours",
  //         "progress": 4,
  //         "total": 3,
  //         "credits_completed": 4,
  //         "credits": 3,
  //         "classes": [
  //           {
  //             "code": "MATH 2413",
  //             "name": "DIFFERENTIAL CALCULUS",
  //             "credits": 4.0,
  //             "status": "completed",
  //             "semester": "2024 Fall"
  //           }
  //         ],
  //         "categories": []
  //       },
  //       {
  //         "name": "Life and Physical Sciences: 6 semester credit hours",
  //         "progress": 0,
  //         "total": 6,
  //         "credits_completed": 0,
  //         "credits": 6,
  //         "classes": [],
  //         "categories": [],
  //         "suggested": [
  //           "PHYS 2325"
  //         ]
  //       },
  //       {
  //         "name": "Language, Philosophy and Culture: 3 semester credit hours",
  //         "progress": 3,
  //         "total": 3,
  //         "credits_completed": 3,
  //         "credits": 3,
  //         "classes": [
  //           {
  //             "code": "PHIL 1301",
  //             "name": "INTRODUCTION TO PHILOSOPHY",
  //             "credits": 3.0,
  //             "status": "completed",
  //             "semester": "transfer_credits"
  //           }
  //         ],
  //         "categories": []
  //       },
  //       {
  //         "name": "Creative Arts: 3 semester credit hours",
  //         "progress": 0,
  //         "total": 3,
  //         "credits_completed": 0,
  //         "credits": 3,
  //         "classes": [],
  //         "categories": []
  //       },
  //       {
  //         "name": "American History: 6 semester credit hours",
  //         "progress": 3,
  //         "total": 6,
  //         "credits_completed": 3,
  //         "credits": 6,
  //         "classes": [
  //           {
  //             "code": "HIST 1301",
  //             "name": "US HIST SURVEY TO CIVIL WAR",
  //             "credits": 3.0,
  //             "status": "completed",
  //             "semester": "test_credits"
  //           }
  //         ],
  //         "categories": []
  //       },
  //       {
  //         "name": "Government/Political Science: 6 semester credit hours",
  //         "progress": 3,
  //         "total": 6,
  //         "credits_completed": 3,
  //         "credits": 6,
  //         "classes": [
  //           {
  //             "code": "GOVT 2305",
  //             "name": "AMERICAN NATIONAL GOVERNMENT",
  //             "credits": 3.0,
  //             "status": "completed",
  //             "semester": "test_credits"
  //           }
  //         ],
  //         "categories": []
  //       },
  //       {
  //         "name": "Social and Behavioral Sciences: 3 semester credit hours",
  //         "progress": 3,
  //         "total": 3,
  //         "credits_completed": 3,
  //         "credits": 3,
  //         "classes": [
  //           {
  //             "code": "GEOG 2303",
  //             "name": "INTRO WORLD GEOGRAPHIC REGIONS",
  //             "credits": 3.0,
  //             "status": "completed",
  //             "semester": "test_credits"
  //           }
  //         ],
  //         "categories": []
  //       },
  //       {
  //         "name": "Component Area Option: 6 semester credit hours",
  //         "progress": 0,
  //         "total": 6,
  //         "credits_completed": 0,
  //         "credits": 6,
  //         "classes": [],
  //         "categories": [],
  //         "suggested": [
  //           "MATH 2414",
  //           "PHYS 2125"
  //         ]
  //       }
  //     ]
  //   },
  //   {
  //     "degree": "Bachelor of Science in Computer Science",
  //     "progress": 0,
  //     "total": 2,
  //     "credits_completed": 26,
  //     "credits": 106,
  //     "categories": [
  //       {
  //         "name": "II. Major Requirements: 72 semester credit hours",
  //         "progress": 0,
  //         "total": 3,
  //         "credits_completed": 17,
  //         "credits": 96,
  //         "classes": [],
  //         "categories": [
  //           {
  //             "name": "Major Preparatory Courses: 24 semester credit hours beyond Core Curriculum",
  //             "progress": 17,
  //             "total": 45,
  //             "credits_completed": 17,
  //             "credits": 45,
  //             "classes": [
  //               {
  //                 "code": "ECS 1100",
  //                 "name": "INTRO TO ENGINEERING AND COMP",
  //                 "credits": 1.0,
  //                 "status": "completed",
  //                 "semester": "2024 Fall"
  //               },
  //               {
  //                 "code": "CS 1200",
  //                 "name": "INTRO TO COMP SCI & SOFTWARE",
  //                 "credits": 2.0,
  //                 "status": "completed",
  //                 "semester": "2024 Fall"
  //               },
  //               {
  //                 "code": "CS 1436",
  //                 "name": "PROGRAMMING FUNDAMENTALS",
  //                 "credits": 4.0,
  //                 "status": "completed",
  //                 "semester": "2024 Fall"
  //               },
  //               {
  //                 "code": "GOVT 2305",
  //                 "name": "AMERICAN NATIONAL GOVERNMENT",
  //                 "credits": 3.0,
  //                 "status": "completed",
  //                 "semester": "test_credits"
  //               },
  //               {
  //                 "code": "RHET 1302",
  //                 "name": "RHETORIC",
  //                 "credits": 3.0,
  //                 "status": "completed",
  //                 "semester": "2024 Fall"
  //               }
  //             ],
  //             "categories": [
  //               {
  //                 "name": "",
  //                 "progress": 0,
  //                 "total": 2,
  //                 "credits_completed": 4,
  //                 "credits": 8,
  //                 "classes": [],
  //                 "categories": [
  //                   {
  //                     "name": "",
  //                     "progress": 4,
  //                     "total": 8,
  //                     "credits_completed": 4,
  //                     "credits": 8,
  //                     "classes": [
  //                       {
  //                         "code": "MATH 2413",
  //                         "name": "DIFFERENTIAL CALCULUS",
  //                         "credits": 4.0,
  //                         "status": "completed",
  //                         "semester": "2024 Fall"
  //                       }
  //                     ],
  //                     "categories": []
  //                   },
  //                   {
  //                     "name": "",
  //                     "progress": 0,
  //                     "total": 8,
  //                     "credits_completed": 0,
  //                     "credits": 8,
  //                     "classes": [],
  //                     "categories": []
  //                   }
  //                 ]
  //               }
  //             ],
  //             "suggested": [
  //               "CS 1337",
  //               "CS 2305",
  //               "MATH 2418"
  //             ]
  //           },
  //           {
  //             "name": "Major Core Courses: 36 semester credit hours beyond Core Curriculum",
  //             "progress": 0,
  //             "total": 39,
  //             "credits_completed": 0,
  //             "credits": 39,
  //             "classes": [],
  //             "categories": [],
  //             "suggested": [
  //               "ECS 2390"
  //             ]
  //           },
  //           {
  //             "name": "Major Technical Electives: 12 semester credit hours",
  //             "progress": 0,
  //             "total": 12,
  //             "credits_completed": 0,
  //             "credits": 12,
  //             "classes": [],
  //             "categories": [],
  //             "suggested": [
  //               "CS 4352"
  //             ]
  //           }
  //         ]
  //       },
  //       {
  //         "name": "III. Elective Requirements: 10 semester credit hours | Free Electives: 10 semester credit hours",
  //         "progress": 9,
  //         "total": 10,
  //         "credits_completed": 9,
  //         "credits": 10,
  //         "classes": [
  //           {
  //             "code": "ENGL 1---",
  //             "name": "ENGL LWR LVL TRANSFER ELECTIVE",
  //             "credits": 3.0,
  //             "status": "completed",
  //             "semester": "test_credits"
  //           },
  //           {
  //             "code": "LIT 1---",
  //             "name": "LIT LWR LVL TRANSFER ELECTIVE",
  //             "credits": 3.0,
  //             "status": "completed",
  //             "semester": "test_credits"
  //           },
  //           {
  //             "code": "STAT 1342",
  //             "name": "STATISTICAL DECISION MAKING",
  //             "credits": 3.0,
  //             "status": "completed",
  //             "semester": "test_credits"
  //           }
  //         ],
  //         "categories": []
  //       }
  //     ]
  //   }
  // ]

  console.log(requirements, typeof requirements);


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
            <p className="mt-4 text-blue-500 font-semibold">Loading...</p>
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-6 text-center">Planner Page</h1>
          <DndProvider backend={HTML5Backend}>
            <div>
              {showOnboarding && (
                <Onboarding
                  onClose={() => setShowOnboarding(false)}
                  onFinish={handleFinishOnboarding}
                  setTranscriptData={setTranscriptData}

                />
              )}
              {showPlanner && <Planner semesters={transformedSemesters} requirements={requirements} />}
            </div>
          </DndProvider>
        </>
      )}
    </div>
  );
};

export default PlannerPage;
