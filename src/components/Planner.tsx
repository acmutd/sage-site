import React, { useState } from "react";
import Sidebar from "./Sidebar";
import SemesterBox from "./SemesterBox";

interface PlannerProps {
    semesters: {
        [key: string]: { title: string; courses: any[] }[];
    };
    requirements: any;
}

const Planner: React.FC<PlannerProps> = ({ semesters, requirements }) => {
    const [allSemesters, setAllSemesters] = useState(semesters);

    const handleDropCourse = (
        targetYear: string,
        targetSemesterIndex: number,
        course: any,
        sourceYear: string,
        sourceSemesterIndex: number,
        courseId?: string
    ) => {
        setAllSemesters((prev) => {
            // Detailed logging
            console.log("=== DROP OPERATION START ===");
            console.log("Course being moved:", course);
            console.log("Course ID used for finding:", courseId || course?.id);
            console.log("Source year/semester:", sourceYear, sourceSemesterIndex);
            console.log("Target year/semester:", targetYear, targetSemesterIndex);
            
            // Log source semester courses for debugging
            const sourceSemesterCourses = prev[sourceYear]?.[sourceSemesterIndex]?.courses;
            console.log("Source semester courses:", sourceSemesterCourses);
            
            // Validate sourceYear
            if (!Array.isArray(prev[sourceYear])) {
                console.error(`Invalid sourceYear: ${sourceYear}`);
                return prev;
            }
    
            // Validate targetYear
            if (!Array.isArray(prev[targetYear])) {
                console.error(`Invalid targetYear: ${targetYear}`);
                return prev;
            }
    
            // Use the explicit course ID if provided, otherwise use the one from the course object
            const courseDragId = courseId || course?.id;
            
            if (!courseDragId) {
                console.error("No course ID found for drag operation");
                return prev;
            }
    
            // Create deep copies to avoid mutation
            const newState = JSON.parse(JSON.stringify(prev));
    
            // Find and remove the exact course from the source
            if (sourceYear && sourceSemesterIndex !== undefined) {
                const sourceSemester = newState[sourceYear][sourceSemesterIndex];
                if (sourceSemester && Array.isArray(sourceSemester.courses)) {
                    // Log all course IDs in source for debugging
                    console.log("All course IDs in source:", 
                        sourceSemester.courses.map((c: any) => ({ id: c.id, code: c.course_code || c.code }))
                    );
                    
                    const courseIndex = sourceSemester.courses.findIndex(
                        (c: any) => c.id === courseDragId
                    );
    
                    console.log("Found course at index:", courseIndex);
    
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
                        console.error(`Course with ID ${courseDragId} not found in source semester`);
                        
                        // Additional debugging - try to find the course by code instead
                        const courseByCode = sourceSemester.courses.find(
                            (c: any) => (c.course_code || c.code) === (course.course_code || course.code)
                        );
                        
                        if (courseByCode) {
                            console.log("Found course by code instead of ID:", courseByCode);
                        }
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

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar
                requirements={requirements}
                expandedCategories={expandedCategories}
                onToggleCategory={toggleCategory}
            />

            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-8">
                    {Object.keys(allSemesters).map((yearKey) => (
                        <div key={yearKey}>
                            <h2 className="text-lg font-semibold text-gray-700 mb-4">
                                {yearKey.replace("year", "Year ")} {/* Optional formatting */}
                            </h2>
                            <div className="grid grid-cols-3 gap-4">
                                {allSemesters[yearKey].map((semester, idx) => (
                                    <SemesterBox
                                        key={idx}
                                        {...semester}
                                        yearKey={yearKey}
                                        semesterIndex={idx}
                                        onDropCourse={(course, sourceYear, sourceSemesterIndex, courseId) =>
                                            handleDropCourse(yearKey, idx, course, sourceYear, sourceSemesterIndex, courseId)
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Planner;