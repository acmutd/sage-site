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
        description?: string;
    };
    status?: 'default' | 'completed' | 'warning' | 'info';
    icon?: 'check' | 'warning' | 'info' | null;
    sourceYear?: string;
    sourceSemesterIndex?: number;
    isSuggested?: boolean;
    isFromTranscript?: boolean;
    isLocked?: boolean;
    inSidebar?: boolean;
    isPlaced?: boolean;
}

const CourseBox: React.FC<CourseBoxProps> = ({
    course,
    sourceYear,
    sourceSemesterIndex,
    status = 'default',
    icon = null,
    isSuggested = false,
    isFromTranscript = false,
    isLocked = false,
    inSidebar = false,
    isPlaced = false,
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const [{ isDragging }, drag] = useDrag(
        () => ({
            type: "COURSE",
            item: () => 
            {
                if (isFromTranscript || isLocked || isPlaced) return null;
                return {
                    course: course,
                    sourceYear,
                    sourceSemesterIndex,
                    courseId: course.id,
                    isSuggested: isSuggested,
                }
            },
            canDrag: () => !isFromTranscript && !isLocked && !isPlaced,
            collect: (monitor) => ({
                isDragging: monitor.isDragging(),
            }),
        }),
        [course, sourceYear, sourceSemesterIndex, isFromTranscript, isLocked, isPlaced]
    );

    const dragRef = !isFromTranscript && !isPlaced ? drag : null;

    const getStatusStyles = () => {
        if (isPlaced) {
            return 'border-gray-300 bg-gray-100 opacity-50';
        }
        if (isSuggested) {
            return 'border-yellow-300 bg-yellow-50';
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

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        if (inSidebar) {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltipPosition({
                top: rect.top,
                left: rect.right + 10,
            });
            setShowTooltip(true);
        }
    };

    const handleMouseLeave = () => {
        if (inSidebar) {
            setShowTooltip(false);
        }
    };

    const tooltipContent = (
        <div className="bg-white text-black rounded-lg p-4 shadow-xl w-72 border border-gray-300">
            <h3 className="font-semibold mb-2 text-sm text-gray-900">
                {course.course_name || "No Name Available"}
            </h3>
            <div className="space-y-0.5 text-xs">
                {course.course_code && (
                    <div className="flex gap-2">
                        <span className="text-gray-600 font-medium">Code:</span>
                        <span className="text-gray-900">{course.course_code}</span>
                    </div>
                )}
                {course.semester && (
                    <div className="flex gap-2">
                        <span className="text-gray-600 font-medium">Semester:</span>
                        <span className="text-gray-900">{course.semester}</span>
                    </div>
                )}
                {course.credits_earned !== undefined && (
                    <div className="flex gap-2">
                        <span className="text-gray-600 font-medium">Credits:</span>
                        <span className="text-gray-900">{course.credits_earned}</span>
                    </div>
                )}
                {course.grade && (
                    <div className="flex gap-2">
                        <span className="text-gray-600 font-medium">Grade:</span>
                        <span className="text-gray-900">{course.grade}</span>
                    </div>
                )}
                {course.status && (
                    <div className="flex gap-2">
                        <span className="text-gray-600 font-medium">Status:</span>
                        <span className="text-gray-900">{course.status}</span>
                    </div>
                )}
                {course.description && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                        <p className="text-gray-700">{course.description}</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div className={inSidebar ? "relative" : "group relative"}>
                <div
                    ref={dragRef}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 ${getStatusStyles()} 
                    transition-all hover:shadow-sm ${isDragging ? "opacity-50" : ""} 
                    ${isFromTranscript || isPlaced ? "cursor-default" : "cursor-grab"}`}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="flex items-center gap-2">
                        {!isFromTranscript && !isPlaced && (
                            <GripVertical className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-sm font-medium text-gray-700 ml-1">
                            {course.course_code || "Unknown Course"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {getIcon()}
                        {isSuggested && !isPlaced && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                                Suggested
                            </span>
                        )}
                        {isPlaced && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                                Planned
                            </span>
                        )}
                    </div>
                </div>

                {/* Tooltip for non-sidebar (inline CSS hover) */}
                {!inSidebar && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[999] opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none">
                        {tooltipContent}
                    </div>
                )}
            </div>

            {/* Tooltip for sidebar (portal) */}
            {inSidebar && showTooltip && ReactDOM.createPortal(
                <div
                    className="fixed z-[9999] pointer-events-none"
                    style={{
                        top: `${tooltipPosition.top}px`,
                        left: `${tooltipPosition.left}px`,
                        transform: 'translateY(-50%)'
                    }}
                >
                    {tooltipContent}
                </div>,
                document.body
            )}
        </>
    );
};

export default CourseBox;
