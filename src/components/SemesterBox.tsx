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
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SemesterBox;