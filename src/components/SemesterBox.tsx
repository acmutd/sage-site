import React, { useState } from "react";
import { Lock, Unlock, MoreVertical, Trash2, Eraser, TriangleAlert } from "lucide-react";
import CourseBox from "./CourseBox";
import { useDrop } from "react-dnd";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// SemesterBox Component
interface SemesterBoxProps {
    title: string;
    isLocked?: boolean;
    courses?: {
        course_code: string;
        course_name: string;
        credits_attempted: number;
        credits_earned: number;
        grade: string;
        id: string;
        status?: string;
        icon?: string | null;
        corequisites?: string[][];
    }[];
    isEmpty?: boolean;
    onDropCourse: (
        course: any,
        sourceYear: string,
        sourceSemesterIndex: number,
        courseId?: string,
        isSuggested?: boolean
    ) => void;
    onClearSemester: () => void;
    onRemoveSemester: () => void;
    onShowError: (message: string) => void;
    yearKey: string;
    semesterIndex: number;
    isFromTranscript?: boolean;
    allSuggestedCourses?: any[];
    allPlannedCourses?: any[];
}

const SemesterBox: React.FC<SemesterBoxProps> = ({
    title,
    isLocked = false,
    courses = [],
    isEmpty = false,
    onDropCourse,
    onClearSemester,
    onRemoveSemester,
    onShowError,
    yearKey,
    semesterIndex,
    isFromTranscript = false,
    allSuggestedCourses = [],
    allPlannedCourses = []
}) => {
    const [locked, setLocked] = useState(isLocked);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [courseToRemove, setCourseToRemove] = useState<string | null>(null);
    const [showCoreqWarning, setShowCoreqWarning] = useState(false);

    const handleLockToggle = () => {
        setLocked((prev) => !prev);
    };

    // Check for unmet corequisites in the semester
    const getUnmetCorequisites = () => {
        if (!courses || courses.length === 0) return null;

        // Create a map of course codes to their corequisites and category paths
        const coreqMap = new Map<string, string[][]>();
        const categoryPathMap = new Map<string, string>();
        
        allSuggestedCourses.forEach((suggestedCourse: any) => {
            const code = suggestedCourse.code || suggestedCourse.course_code;
            if (code) {
                if (suggestedCourse.corequisites && Array.isArray(suggestedCourse.corequisites)) {
                    coreqMap.set(code, suggestedCourse.corequisites);
                }
                if (suggestedCourse.categoryPath) {
                    categoryPathMap.set(code, suggestedCourse.categoryPath);
                }
            }
        });

        // Get all planned course codes (in any semester)
        const allPlannedCourseCodes = new Set(
            allPlannedCourses.map((c: any) => c.course_code || c.code)
        );

        // Check each course in this semester for unmet corequisites
        const unmetCoreqs: { course: string; missing: string[]; locations: string[] }[] = [];

        courses.forEach(course => {
            const coreqs = coreqMap.get(course.course_code);
            if (!coreqs || coreqs.length === 0) return;

            // Check each corequisite group
            coreqs.forEach((coreqGroup: string[]) => {
                if (!Array.isArray(coreqGroup) || coreqGroup.length === 0) return;

                // Check if ANY course from this coreq group is planned
                const hasAnyCoreqPlanned = coreqGroup.some(coreqCode => 
                    allPlannedCourseCodes.has(coreqCode)
                );

                // If no course from this coreq group is planned, it's unmet
                if (!hasAnyCoreqPlanned) {
                    // Get the category paths for each coreq in the group
                    const locations = coreqGroup
                        .map(coreqCode => categoryPathMap.get(coreqCode))
                        .filter((path): path is string => !!path);
                    
                    // Remove duplicates
                    const uniqueLocations = [...new Set(locations)];
                    
                    unmetCoreqs.push({
                        course: course.course_code,
                        missing: coreqGroup,
                        locations: uniqueLocations
                    });
                }
            });
        });

        return unmetCoreqs.length > 0 ? unmetCoreqs : null;
    };

    const unmetCorequisites = getUnmetCorequisites();

    const handleClearClick = () => {
        if (locked) {
            onShowError?.(`${title} needs to be unlocked to clear courses.`);
            return;
        }
        onClearSemester();
    }

    // mobile view (phone)
    const handleRemoveCourse = (courseId: string) => {
        setCourseToRemove(courseId);
        setShowRemoveModal(true);
    };

    const confirmRemove = () => {
        if (courseToRemove) {
            onDropCourse(null, yearKey, semesterIndex, courseToRemove, false);
        }
        setShowRemoveModal(false);
        setCourseToRemove(null);
    };

    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: "COURSE",
        drop: (item: any) => {
            if (isFromTranscript || locked) return; // Prevent dropping if it's from transcriptData (or if user chose to lock semester)
            console.log("Dropping item:", item); // Log the exact item being dropped for debugging

            onDropCourse(
                item.course,
                item.sourceYear,
                item.sourceSemesterIndex,
                item.courseId, // Use the explicit course ID from the drag item
                item.isSuggested
            );
        },
        canDrop: () => !isFromTranscript && !locked,
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [locked, isFromTranscript, onDropCourse]);

    // console.log("SemesterBox courses:", courses);

    return (
        <div
            ref={!isFromTranscript ? drop : null}
            className={`
                bg-white rounded-md border border-gray-200 shadow-sm p-4 
                w-full md:w-[280px] lg:w-[317px]
                ${locked ? "opacity-75 bg-gray-50" : ""} 
                ${isOver && canDrop ? "bg-blue-50" : ""}
            `}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-800">{title}</h3>
                {!isFromTranscript && (

                    <div className="flex items-center gap-2">
                        {unmetCorequisites && unmetCorequisites.length > 0 && (
                            <div className="relative">
                                <button
                                    onMouseEnter={() => setShowCoreqWarning(true)}
                                    onMouseLeave={() => setShowCoreqWarning(false)}
                                    onClick={() => setShowCoreqWarning(!showCoreqWarning)}
                                    className="hover:bg-orange-50 p-1 rounded"
                                    title="Unmet corequisites"
                                >
                                    <TriangleAlert className="w-4 h-4 stroke-red-600" />
                                </button>
                                {showCoreqWarning && (
                                    <div className="absolute top-full mb-2 right-0 z-50 w-64 bg-white border-2 border-orange-300 rounded-md shadow-lg p-3">
                                        <div className="text-sm">
                                            <div className="font-semibold  mb-2 flex items-center gap-2">
                                                <TriangleAlert className="w-4 h-4" />
                                                Corequisite Warning
                                            </div>
                                            <p className=" text-xs mb-2">
                                                The following courses need corequisites:
                                            </p>
                                            <div className="space-y-2">
                                                {unmetCorequisites.map((item, idx) => (
                                                    <div key={idx} className=" p-2 rounded border ">
                                                        <div className="font-medium text-xs mb-1">
                                                            {item.course}
                                                        </div>
                                                        <div className=" text-xs">
                                                            Needs: {item.missing.join(' or ')}
                                                        </div>
                                                        {item.locations && item.locations.length > 0 && (
                                                            <div className=" text-xs mt-1 pt-1 border-t ">
                                                                📍 {item.locations
                                                                    .map((loc: string) => {
                                                                        // Get last part of path
                                                                        const lastPart = loc.split(' > ').pop() || loc;
                                                                        // If contains ":", take first part
                                                                        return lastPart.includes(':') ? lastPart.split(':')[0] : lastPart;
                                                                    })
                                                                    .join(' / ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <button
                            onClick={handleLockToggle}
                            className={`hover:bg-gray-100 p-1 rounded ${
                                locked ? "text-gray-700" : "text-gray-400"
                            }`}
                            title={locked ? "Unlock semester" : "Lock semester"}
                        >
                            {locked ? (
                                <Lock className="w-4 h-4" />
                            ) : (
                                <Unlock className="w-4 h-4" /> 
                            )}
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="hover:bg-gray-100 p-1 rounded">
                                    <MoreVertical className="w-4 h-4 text-gray-600" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                    className="text-amber-600 focus:text-amber-600 hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100 data-[highlighted]:text-amber-600"
                                    onClick={handleClearClick}
                                >
                                    <Eraser className="w-4 h-4 mr-2" />
                                    Clear Semester
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100 data-[highlighted]:text-destructive"
                                    onClick={onRemoveSemester}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remove Semester
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            {isEmpty ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                    No classes were taken in this semester
                </p>
            ) : courses.length === 0 ? (
                <div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed border-gray-200 bg-gray-50 rounded-md">
                    Drag and drop classes here
                </div>
            ) : (
                <div className="space-y-2">
                    {courses.map((course, idx) => (
                        <CourseBox
                            key={course.id || `${course.course_code || 'unknown'}-${idx}`} // Use ID as key when available
                            course={course}
                            sourceYear={yearKey}
                            sourceSemesterIndex={semesterIndex}
                            isFromTranscript={isFromTranscript}
                            isLocked={locked}
                            status={
                                course.status as
                                | "default"
                                | "completed"
                                | "warning"
                                | "info"
                                | undefined
                            }
                            icon={
                                course.icon as
                                | "check"
                                | "warning"
                                | "info"
                                | null
                                | undefined
                            }
                            onRemove={() => handleRemoveCourse(course.id)}
                        />
                    ))}
                </div>
            )}
            {showRemoveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[90]" onClick={() => setShowRemoveModal(false)}>
                    <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4">Remove Course?</h3>
                        <p className="text-sm text-gray-600 mb-6">This course will be removed from {title}.</p>
                        <div className="flex justify-end gap-4">
                            <button className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300" onClick={() => setShowRemoveModal(false)}>Cancel</button>
                            <button className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700" onClick={confirmRemove}>Remove</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SemesterBox;