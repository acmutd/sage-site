import React, { useState } from "react";
import { Lock, Unlock, MoreVertical, Trash2, Eraser } from "lucide-react";
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
        icon?: string | null
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
    isFromTranscript?: boolean
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
    isFromTranscript = false
}) => {
    const [locked, setLocked] = useState(isLocked);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [courseToRemove, setCourseToRemove] = useState<string | null>(null);

    const handleLockToggle = () => {
        setLocked((prev) => !prev);
    };

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