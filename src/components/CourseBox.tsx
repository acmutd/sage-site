import { AlertTriangle, Info, CheckCircle, GripVertical } from 'lucide-react';
import { useDrag } from "react-dnd";
import { useState } from "react";
import ReactDOM from "react-dom";


interface CourseBoxProps {
    course: {
        course_code: string;
        course_name: string;
        credits_attempted?: number;
        credits_earned?: number;
        grade?: string;
        id?: string;
        status?: string;
        semester?: string;
        description?: string; // Add description as optional
    };
    status?: 'default' | 'completed' | 'warning' | 'info';
    icon?: 'check' | 'warning' | 'info' | null;
    sourceYear?: string;
    sourceSemesterIndex?: number;
    isSuggested?: boolean;
}

const CourseBox: React.FC<CourseBoxProps> = ({
    course,
    sourceYear,
    sourceSemesterIndex,
    status = 'default',
    icon = null,
    isSuggested = false
}) => {

    const [isHovered, setIsHovered] = useState(false); // Track hover state
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({
        top: 0,
        left: 0,
    });

    // console.log(course)

    const [{ isDragging }, drag] = useDrag(() => ({
        type: "COURSE",
        item: {
            course: course,
            sourceYear,
            sourceSemesterIndex,
            courseId: course.id
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    const getStatusStyles = () => {
        if (isSuggested) {
            return 'border-yellow-300 bg-yellow-50'; // Yellow style for suggested courses
        }
        switch (status) {
            case 'completed':
                return 'border-green-300 bg-white';
            case 'warning':
                return 'border-yellow-400 bg-yellow-50';
            case 'info':
                return 'border-blue-300 bg-white';
            default:
                return 'border-gray-200 bg-white';
        }
    };

    const getIcon = () => {
        if (icon === 'check') return <CheckCircle className="w-4 h-4 text-green-500" />;
        if (icon === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
        if (icon === 'info') return <Info className="w-4 h-4 text-blue-500" />;
        return null;
    };

    const handleMouseEnter = (event: React.MouseEvent) => {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        setTooltipPosition({
            top: rect.top + window.scrollY - 10, // Position above the box
            left: rect.right + window.scrollX + 10, // Position slightly to the right
        });
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    return (
        <>
            <div
                ref={drag}
                className={`flex items-center justify-between p-3 rounded-lg border-2 ${getStatusStyles()} 
                transition-all hover:shadow-sm ${isDragging ? "opacity-50" : ""} 
                cursor-grab relative`} // Added relative positioning, z-index, and cursor
                onMouseEnter={handleMouseEnter} // Show tooltip on hover
                onMouseLeave={handleMouseLeave} // Hide tooltip when not hovering
            >
                <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 ml-1">
                        {course.course_code || "Unknown Course"}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {getIcon()}
                    {isSuggested && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                            Suggested
                        </span>
                    )}
                </div>
            </div>

            {isHovered &&
                ReactDOM.createPortal(
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 bg-white border border-gray-300 shadow-lg rounded-lg p-4 z-50"
                        style={{
                            position: "absolute",
                            top: tooltipPosition.top,
                            left: tooltipPosition.left,
                        }}
                    >
                        <h3 className="text-sm font-bold text-gray-800 mb-2">
                            {course.course_name || "No Name Available"}
                        </h3>
                        <p className="text-xs text-gray-600 mb-1">
                            <strong>Code:</strong> {course.course_code || course.course_code || "N/A"}
                        </p>
                        <p className="text-xs text-gray-600 mb-1">
                            <strong>Semester:</strong> {course.semester || "N/A"}
                        </p>
                        <p className="text-xs text-gray-600 mb-1">
                            <strong>Credits Earned:</strong> {course.credits_earned || "N/A"}
                        </p>
                        <p className="text-xs text-gray-600 mb-1">
                            <strong>Status:</strong> {course.status || "N/A"}
                        </p>
                        <p className="text-xs text-gray-600">
                            <strong>Description:</strong> {course.description || "No description available."}
                        </p>
                    </div>,
                    document.body
                )}
        </>
    );
};

export default CourseBox;
