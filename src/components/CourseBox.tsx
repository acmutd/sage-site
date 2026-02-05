import { AlertTriangle, Info, CheckCircle, GripVertical, Trash2, CirclePlus } from 'lucide-react';
import { useDrag } from "react-dnd";
import { useEffect, useState } from "react";
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
        code?: string;
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
    onAdd?: () => void;
    onRemove?: () => void;
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
    onAdd,
    onRemove
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    
    // mobile check - does it have a cursor or does it have touch?
    const [canHover, setCanHover] = useState(true);
    useEffect(() => {
        const checkHover = () => {
            // Check if device has fine pointer (mouse) and can hover
            const hoverQuery = window.matchMedia('(hover: hover)');
            setCanHover(hoverQuery.matches);
        };
        checkHover();
        
        const hoverQuery = window.matchMedia('(hover: hover)');
        const handleChange = () => checkHover();
        hoverQuery.addEventListener('change', handleChange);
        
        return () => hoverQuery.removeEventListener('change', handleChange);
    }, []);
    
    // mobile check - screen size for layout
    const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
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
        if (inSidebar && canHover) {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltipPosition({
                top: rect.top,
                left: rect.right + 10,
            });
            setShowTooltip(true);
        }
    };

    const handleInfoClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canHover) {
            setShowTooltip(!showTooltip);
        }
    };
    const handleMouseLeave = () => {
        if (inSidebar) {
            setShowTooltip(false);
        }
    };

    const tooltipContent = (
        <div className={`
            ${!canHover 
                ? "bg-white text-black rounded-t-2xl p-4 shadow-2xl w-full border-t-2 border-gray-200" 
                : "bg-white text-black rounded-md p-3 shadow-lg w-56 md:w-64 border border-gray-200"
            }
        `}>
            <h3 className={`font-semibold mb-2 ${!canHover ? "text-base" : "text-sm"} text-gray-900`}>
                {course.course_name || "No Name Available"}
            </h3>
            <div className={`space-y-1 ${!canHover ? "text-sm" : "text-xs"}`}>
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
                    className={`flex items-center justify-between p-3 rounded-md border-2 ${getStatusStyles()} 
                    transition-all hover:shadow-sm ${isDragging ? "opacity-50" : ""} 
                    ${isFromTranscript || isPlaced ? "cursor-default" : "cursor-grab"}`}
                    onMouseEnter={canHover ? handleMouseEnter : undefined}
                    onMouseLeave={canHover ? handleMouseLeave : undefined}
                >
                    <div className="flex items-center gap-2">
                        {isMobile ? (
                            <>
                                {inSidebar && onAdd && !isPlaced && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAdd();
                                        }}
                                    ><CirclePlus className="w-4 h-4 mr-2"/>
                                    </button>
                                )}
                                {!inSidebar && onRemove && !isFromTranscript && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove();
                                        }}
                                    ><Trash2 className="w-4 h-4 mr-2" />
                                    </button>
                                )}
                            </>
                        ) : (
                            !isFromTranscript && !isPlaced && (
                                <GripVertical className="w-4 h-4 text-gray-400" />
                            )
                        )}
                        <span className="text-sm font-medium text-gray-700 ml-1">
                            {course.course_code || "Unknown Course"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {canHover && getIcon()}
                        {isSuggested && !isPlaced && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-md">
                                Suggested
                            </span>
                        )}
                        {isPlaced && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md ">
                                Planned
                            </span>
                        )}
                        {!canHover && (
                            <button
                                onClick={handleInfoClick}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <Info className="w-4 h-4 text-blue-500" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tooltip for non-sidebar (inline CSS hover) */}
                {!inSidebar && canHover && (
                    <>
                        {/* Tooltip to the right (default) */}
                        <div className="hidden xl:block absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[999] opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none">
                            {tooltipContent}
                        </div>
                        {/* Tooltip above (for smaller screens where right would overflow) */}
                        <div className="block xl:hidden absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-[999] opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none">
                            {tooltipContent}
                        </div>
                    </>
                )}
            </div>

            {/* Tooltip for sidebar (portal) */}
            {((inSidebar && showTooltip) || (!canHover && showTooltip)) && ReactDOM.createPortal(
                !canHover ? (
                    // Mobile: Bottom sheet with overlay
                    <>
                        <div 
                            className="fixed inset-0 bg-black bg-opacity-30 z-[9998]"
                            onClick={() => setShowTooltip(false)}
                        />
                        <div
                            className="fixed bottom-0 left-0 right-0 z-[9999] animate-slide-up"
                            style={{
                                animation: 'slideUp 0.3s ease-out'
                            }}
                        >
                            {tooltipContent}
                        </div>
                    </>
                ) : (
                    // Desktop: Side tooltip
                    inSidebar ? (
                        <div
                            className="fixed z-[9999] pointer-events-none"
                            style={{
                                top: `${tooltipPosition.top}px`,
                                left: `${tooltipPosition.left}px`,
                                transform: 'translateY(-50%)'
                            }}
                        >
                            {tooltipContent}
                        </div>
                    ) : null
                ),
                document.body
            )}
        </>
    );
};

export default CourseBox;
