import React, { useState } from "react";
import { Lock, Unlock, MoreVertical } from "lucide-react";
import CourseBox from "./CourseBox";
import { useDrop } from "react-dnd";

// SemesterBox Component
interface SemesterBoxProps {
    title: string;
    isLocked?: boolean;
    courses?: {
        course_code: string;
        id?: string;
        status?: string;
        icon?: string | null
    }[];
    isEmpty?: boolean;
    onDropCourse: (
        course: any,
        sourceYear: string,
        sourceSemesterIndex: number,
        courseId?: string
    ) => void;
    yearKey: string;
    semesterIndex: number;
}

const SemesterBox: React.FC<SemesterBoxProps> = ({
    title,
    isLocked = false,
    courses = [],
    isEmpty = false,
    onDropCourse,
    yearKey,
    semesterIndex,
}) => {
    const [locked, setLocked] = useState(isLocked);

    const handleLockToggle = () => {
        setLocked((prev) => !prev);
    };

    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: "COURSE",
        drop: (item: any) => {
            // Log the exact item being dropped for debugging
            console.log("Dropping item:", item);
            
            onDropCourse(
                item.course,
                item.sourceYear,
                item.sourceSemesterIndex,
                item.courseId // Use the explicit course ID from the drag item
            );
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }));

    return (
        <div
            ref={drop}
            className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 w-[317px] ${isOver && canDrop ? "bg-blue-50" : ""
                }`}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-800">{title}</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleLockToggle}
                        className="hover:bg-gray-100 p-1 rounded"
                    >
                        {locked ? (
                            <Unlock className="w-4 h-4 text-gray-400" />
                        ) : (
                            <Lock className="w-4 h-4 text-gray-400" />
                        )}
                    </button>
                    <button className="hover:bg-gray-100 p-1 rounded">
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
            </div>

            {isEmpty ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                    No classes were taken in this semester
                </p>
            ) : courses.length === 0 ? (
                <div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
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