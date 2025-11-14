import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import SemesterBox from "./SemesterBox";
import { Plus, PlusCircle } from "lucide-react";

interface PlannerProps {
    semesters: {
        [key: string]: { title: string; courses: any[]; isFromTranscript?: boolean }[];
    };
    requirements: any;
}

const Planner: React.FC<PlannerProps> = ({ semesters, requirements }) => {
    const [allSemesters, setAllSemesters] = useState(() => {
        const updatedSemesters = { ...semesters };
        Object.keys(updatedSemesters).forEach((yearKey) => {
            updatedSemesters[yearKey] = updatedSemesters[yearKey].map((semester) => ({
                ...semester,
                isFromTranscript: true, // Mark all semesters as from transcriptData
            }));
        });
        return updatedSemesters;
    });


    const [error, setError] = useState<string | null>(null);

    const errorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (error && errorRef.current) {
            setTimeout(() => {
                // Get the scrollable container (which is the parent of the error div)
                const scrollContainer = errorRef.current?.closest('.overflow-y-auto');

                if (scrollContainer) {
                    // Calculate the navbar height (adjust this value to match your navbar height)
                    const navbarHeight = 64; // Example: 64px - adjust this based on your actual navbar height

                    // Scroll within the container, accounting for navbar height
                    scrollContainer.scrollTo({
                        top: errorRef.current ? (errorRef.current.offsetTop - navbarHeight - 20) : 0,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
    }, [error]);


    const adaptedRequirements = useMemo(() => {
        return requirements;
    }, [requirements]);

    const handleDropCourse = (
        targetYear: string,
        targetSemesterIndex: number,
        course: any,
        sourceYear: string,
        sourceSemesterIndex: number,
        courseId?: string,
        isSuggested?: boolean
    ) => {
        setAllSemesters((prev) => {
            console.log("=== DROP OPERATION START ===");
            console.log("Course being moved:", course);
            console.log("Course ID used for finding:", courseId || course?.id);
            console.log("Source year/semester:", sourceYear, sourceSemesterIndex);
            console.log("Target year/semester:", targetYear, targetSemesterIndex);
            console.log("Is suggested course:", isSuggested);

            // Create deep copies to avoid mutation
            const newState = JSON.parse(JSON.stringify(prev));

            // For suggested courses, we don't need to remove from source
            // Just add a new copy to the target
            if (isSuggested) {
                const targetSemester = newState[targetYear][targetSemesterIndex];
                if (targetSemester && Array.isArray(targetSemester.courses)) {
                    // Create a proper course object from the suggestion
                    const newCourseId = `${targetYear}-${targetSemester.title}-${course.course_code}-${targetSemester.courses.length}-${Date.now()}`;

                    const newCourse = {
                        course_code: course.code || course.course_code,
                        name: course.name || `${course.code || course.course_code} Course`,
                        credits: course.credits || 3, // Default credits if not specified
                        id: newCourseId,
                        status: 'default'
                    };

                    targetSemester.courses.push(newCourse);
                    console.log("Added suggested course to target:", newCourse);
                }

                return newState;
            }

            // For regular courses, handle as before
            // Find and remove the exact course from the source
            if (sourceYear && sourceSemesterIndex !== undefined) {
                const sourceSemester = newState[sourceYear][sourceSemesterIndex];
                if (sourceSemester && Array.isArray(sourceSemester.courses)) {
                    const courseIndex = sourceSemester.courses.findIndex(
                        (c: any) => c.id === courseId
                    );

                    if (courseIndex !== -1) {
                        // Remove this specific course
                        const [removedCourse] = sourceSemester.courses.splice(courseIndex, 1);
                        console.log("Successfully removed course:", removedCourse);

                        // Add to the target semester
                        if (targetYear && targetSemesterIndex !== undefined) {
                            const targetSemester = newState[targetYear][targetSemesterIndex];
                            if (targetSemester && Array.isArray(targetSemester.courses)) {
                                targetSemester.courses.push(removedCourse);
                                console.log("Added course to target:", removedCourse);
                            }
                        }
                    } else {
                        console.error(`Course with ID ${courseId} not found in source semester`);
                    }
                }
            }

            console.log("=== DROP OPERATION END ===");
            return newState;
        });
    };
    const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({
        0: true,
        1: true,
        2: true,
    });

    const toggleCategory = (index: number) => {
        setExpandedCategories((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    const getNextYearNumber = () => {
        const yearNumbers = Object.keys(allSemesters)
            .map(key => parseInt(key.replace('year', '')))
            .filter(num => !isNaN(num));

        if (yearNumbers.length === 0) return 1;
        return Math.max(...yearNumbers) + 1;
    };

    const handleAddYear = () => {
        const nextYearNum = getNextYearNumber();
        const nextYear = `year${nextYearNum}`;

        // Find the last year in the existing semesters to determine the next calendar year
        let nextFallYear;

        if (Object.keys(allSemesters).length === 0) {
            // If there are no years yet, start with the current year
            nextFallYear = new Date().getFullYear();
        } else {
            // Find the latest semester's year and determine the next one
            const lastYearKey = Object.keys(allSemesters).sort().pop();
            if (lastYearKey) {
                const lastSemesters = allSemesters[lastYearKey];
                // Find the last Fall semester's year or use the last semester's year
                const lastSemester = lastSemesters[lastSemesters.length - 1];
                const lastYear = parseInt(lastSemester.title.split(' ')[1]);

                // If the last semester is Summer, the next Fall should be in the same year
                // If it's Spring or Fall, the next Fall should be in the next year
                if (lastSemester.title.includes('Summer')) {
                    nextFallYear = lastYear;
                } else if (lastSemester.title.includes('Spring')) {
                    nextFallYear = lastYear;
                } else { // Fall
                    nextFallYear = lastYear + 1;
                }
            } else {
                nextFallYear = new Date().getFullYear();
            }
        }

        setAllSemesters(prev => ({
            ...prev,
            [nextYear]: [
                { title: `Fall ${nextFallYear}`, courses: [] },
                // { title: `Spring ${nextFallYear + 1}`, courses: [] },
                // { title: `Summer ${nextFallYear + 1}`, courses: [] }
            ]
        }));
    };

    const handleAddSemester = (yearKey: string) => {
        setAllSemesters(prev => {
            const yearSemesters = [...prev[yearKey]];

            // Check if we already have all three semesters
            if (yearSemesters.length >= 3) {
                // Set an error message
                setError(`Cannot add more than 3 semesters (Fall, Spring, Summer) to ${yearKey.replace("year", "Year ")}`);
                // Return the unchanged state
                return prev;
            }

            // Clear any previous errors
            setError(null);

            const lastSemester = yearSemesters[yearSemesters.length - 1];
            const lastSemesterYear = parseInt(lastSemester.title.split(' ')[1]);

            // Determine the next semester based on the last one
            let nextSemester;
            if (lastSemester.title.includes('Fall')) {
                nextSemester = { title: `Spring ${lastSemesterYear + 1}`, courses: [], isFromTranscript: false,
            };
            } else if (lastSemester.title.includes('Spring')) {
                nextSemester = { title: `Summer ${lastSemesterYear}`, courses: [], isFromTranscript: false, };
            } else {
                nextSemester = { title: `Fall ${lastSemesterYear}`, courses: [], isFromTranscript: false, };
            }

            return {
                ...prev,
                [yearKey]: [...yearSemesters, nextSemester]
            };
        });
    };

    console.log(allSemesters)


    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar
                requirements={adaptedRequirements}
                expandedCategories={expandedCategories}
                onToggleCategory={toggleCategory}
            />

            <div className="flex-1 overflow-y-auto p-6">
                {/* <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Academic Plan</h1>
                    <button
                        onClick={handleAddYear}
                        className="flex items-center gap-2 px-4 py-2 bg-green-400 hover:bg-green-500 rounded-full text-sm font-medium transition-colors"
                    >
                        <PlusCircle className="w-5 h-5" />
                        <span>Add Year</span>
                    </button>
                </div> */}
                {error && (
                    <div
                        ref={errorRef}
                        className="mb-4 mt-2 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded shadow-sm"
                    >
                        <div className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 01-1-1v-4a1 1 0 112 0v4a1 1 0 01-1 1z"
                                    clipRule="evenodd" />
                            </svg>
                            <span>{error}</span>
                            <button
                                onClick={() => setError(null)}
                                className="ml-auto text-red-700 hover:text-red-900"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}
                <div className="space-y-8">
                    {Object.keys(allSemesters).map((yearKey) => (
                        <div key={yearKey}>
                            <div className="flex justify-between items-center mb-4">

                                <h2 className="text-lg font-semibold text-gray-700 mb-4">
                                    {yearKey.replace("year", "Year ")} {/* Optional formatting */}
                                </h2>
                                <button
                                    onClick={() => handleAddSemester(yearKey)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-400 hover:bg-green-500 rounded-full text-sm font-medium transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add Semester</span>
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-4">
                                {allSemesters[yearKey].map((semester, idx) => (
                                    <SemesterBox
                                        key={idx}
                                        {...semester}
                                        yearKey={yearKey}
                                        semesterIndex={idx}
                                        isFromTranscript={semester.isFromTranscript || false} // Dynamically set isFromTranscript
                                        onDropCourse={(course, sourceYear, sourceSemesterIndex, courseId, isSuggested) =>
                                            handleDropCourse(yearKey, idx, course, sourceYear, sourceSemesterIndex, courseId, isSuggested)
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {Object.keys(allSemesters).length > 0 && (
                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleAddYear}
                            className="flex items-center gap-2 px-4 py-2 bg-green-400 hover:bg-green-500 rounded-full text-sm font-medium transition-colors"
                        >
                            <PlusCircle className="w-4 h-4" />
                            <span>Add Another Year</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Planner;