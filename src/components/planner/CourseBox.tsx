import { AlertTriangle, Info, CheckCircle, GripVertical, Trash2, CirclePlus, TriangleAlert } from 'lucide-react';
import { useDrag } from "react-dnd";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Course } from '@/types/course';
import { Warning } from '@/types/warning';

interface CourseBoxProps {
    course: Course;
    status?: 'default' | 'completed' | 'warning' | 'info';
    icon?: 'check' | 'warning' | 'info' | null;
    sourceYear?: string;
    sourceSemesterIndex?: number;
    isSuggested?: boolean;
    isFromTranscript?: boolean;
    isLocked?: boolean;
    inSidebar?: boolean;
    isPlaced?: boolean;
    warnings?: Warning[] | null;
    hasWarningBorder?: boolean;
    onAdd?: () => void;
    onRemove?: () => void;
}

let closeActiveTooltip: (() => void) | null = null; // singleton to prevent multi-drags

const DAY_ABBR: Record<string, string> = {
    Monday: "M", Tuesday: "Tu", Wednesday: "W", Thursday: "Th", Friday: "F", Saturday: "S"
};

const DayPips = ({ days }: { days: string }) => {
    const active = new Set(days.split(",").map(d => d.trim()));
    return (
        <div className="flex gap-1">
            {["Monday","Tuesday","Wednesday","Thursday","Friday"].map(d => (
                <span key={d} className={`
                    font-dmsans text-[9px] font-bold w-5 h-5 rounded-sm
                    flex items-center justify-center
                    ${active.has(d) ? "bg-accent text-black" : "bg-innercontainer text-textsecondary"}
                `}>
                    {DAY_ABBR[d]}
                </span>
            ))}
        </div>
    );
};


const WarningSection: React.FC<{ warnings: Warning[] }> = ({ warnings }) => {
    const getWarningStyles = (severity: string) => {
        switch(severity) {
            case 'error': return 'bg-red-50 border-red-300 text-red-900';
            case 'warning': return 'bg-orange-50 border-orange-300 text-orange-900';
            default: return 'bg-blue-50 border-blue-300 text-blue-900';
        }
    };

    const getLocationBorderStyles = (severity: string) => {
        switch(severity) {
            case 'error': return 'border-red-200';
            case 'warning': return 'border-orange-200';
            default: return 'border-blue-200';
        }
    };

    const formatLocationLabel = (loc: string) => {
        const trimmed = loc.trim();
        const lastPart = trimmed.split(' > ').pop() || trimmed;
        return lastPart.includes(':') ? lastPart.split(':')[0].trim() : lastPart;
    };

    return (
        <div className="space-y-2">
            {warnings.map((warning, idx) => {
                const details = warning.details || [];
                const locationDetail = details.find((detail) => detail.startsWith("Location:"));
                const nonLocationDetails = details.filter((detail) => !detail.startsWith("Location:"));
                const locationValue = locationDetail?.replace(/^Location:\s*/, "");
                const formattedLocations = locationValue
                    ? locationValue
                        .split('/')
                        .map((loc) => formatLocationLabel(loc))
                        .filter(Boolean)
                        .join(' / ')
                    : "";

                return (
                    <div key={idx} className={`mt-2 pt-2 border-t -mx-3 px-3 pb-2 ${getWarningStyles(warning.severity)}`}>
                        <div>
                            <p className="font-semibold mb-1">{warning.message}</p>
                            {nonLocationDetails.length > 0 && (
                                <ul className="list-disc ml-4 mt-1">
                                    {nonLocationDetails.map((detail, i) => (
                                        <li key={i}>{detail}</li>
                                    ))}
                                </ul>
                            )}
                            {formattedLocations && (
                                <div className={`text-xs mt-1 pt-1 border-t ${getLocationBorderStyles(warning.severity)}`}>
                                    📍 {formattedLocations}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


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
    warnings = null,
    hasWarningBorder = false,
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

    useEffect(() => {
        if (isDragging) {
            setShowTooltip(false);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        }
    }, [isDragging]);

    useEffect(() => {
        return () => {
            if (closeActiveTooltip) closeActiveTooltip = null;
        };
    }, []);
    
    const dragRef = !isFromTranscript && !isPlaced ? drag : null;

    const getStatusStyles = () => {
        if (isPlaced) {
            return 'border-gray-300 bg-gray-100 opacity-50';
        }
        if (isSuggested) {
            return 'border-yellow-300 bg-yellow-50';
        }
        if (hasWarningBorder) {
            return 'border-red-600 bg-white';
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

    const getWarningIndicatorIcon = () => {
        if (!warnings || warnings.length === 0) return null;
        return <TriangleAlert className={`w-4 h-4 ${
                'stroke-red-600' 
        }`} />
    };

    const hasPrerequisiteWarning = !!warnings?.some(
        (warning) => warning.type === 'prerequisite'
    );

    const shouldReplaceSidebarInfoIcon =
        inSidebar && canHover && icon === 'info' && hasPrerequisiteWarning;

    const shouldShowWarningIcon =
        inSidebar ? hasPrerequisiteWarning : !!warnings?.length;

    const isActiveTooltipRef = useRef(false);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const tooltipAnimatedRef = useRef(false);
    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        if (inSidebar && canHover) {
            if (closeActiveTooltip) closeActiveTooltip();
            isActiveTooltipRef.current = true;
            closeActiveTooltip = () => {
                isActiveTooltipRef.current = false;
                setShowTooltip(false);
            };
    
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltipPosition({ top: rect.top, left: rect.right + 10 });
            tooltipAnimatedRef.current = false;
            setShowTooltip(true);
        }
    };
    
    const handleMouseLeave = () => {
        if (inSidebar) {
            hideTimeoutRef.current = setTimeout(() => {
                setShowTooltip(false);
                if (isActiveTooltipRef.current) {
                    closeActiveTooltip = null;
                    isActiveTooltipRef.current = false;
                }
            }, 200);
        }
    };

    const handleInfoClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canHover) {
            setShowTooltip(!showTooltip);
        }
    };

    const sections: any[] = 
        (course.status === "completed" || course.status === "in progress")
            ? []
            : (course as any).sections || [];

            const tooltipContent = (
                <div className={`
                    ${!canHover 
                        ? "bg-white text-black rounded-t-2xl p-4 shadow-2xl w-full border-t-2 border-gray-200 max-h-[80vh] overflow-y-auto" 
                        : `bg-white text-black rounded-md p-3 shadow-lg border border-gray-200 ${sections.length > 0 ? "w-[500px] max-h-[400px] overflow-y-auto" : "w-56 md:w-64"}`
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
        
                        {warnings && warnings.length > 0 && (
                                    <WarningSection warnings={warnings} />
                                )}
                
                        {course.description && (
                            <div className={`mt-2 pt-2 ${!(warnings && warnings.length > 0) ? 'border-t border-gray-300' : ''}`}>
                                <p className="text-gray-700">{course.description}</p>
                            </div>
                        )}

                        {sections.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-300 ">
                                <div className="grid py-1" style={{ gridTemplateColumns: "110px 120px 150px 80px" }}>
                                    {["Section", "Instructor", "Schedule", "Room"].map((h, i) => (
                                        <span key={h} className="text-[9px] font-bold tracking-widest uppercase text-gray-400"
                                            style={{ textAlign: i === 4 ? "right" : "left" }}>
                                            {h}
                                        </span>
                                    ))}
                                </div>
                                {sections.map((sec: any, i: number) => {
                                    return (
                                        <div key={i} className="grid py-2 items-center border-t border-gray-100"
                                            style={{ gridTemplateColumns: "110px 120px 150px 80px" }}>
                                            <div>
                                                <div className="text-xs font-bold tracking-wide">
                                                    {sec.course_prefix?.toUpperCase()} {sec.course_number}.{sec.section?.trim()}
                                                </div>
                                                <div className="text-[10px] text-gray-400">#{sec.class_number}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-800 truncate max-w-[90px]" title={sec.instructors}>{sec.instructors?.split(",")[0].trim()}{sec.instructors?.includes(",") ? " +" : ""}</div>
                                                <div className="text-[10px] text-gray-400">{sec.activity_type}</div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex gap-1">
                                                    {sec.days && <DayPips days={sec.days} />}
                                                </div>
                                                <span className="text-[10px] text-gray-500">{sec.times_12h?.split(";")[0].trim()}</span>
                                            </div>
                                            <div className={`text-xs ${sec.location === "Online" ? "text-[#5AED86] font-semibold" : "text-gray-600"}`}>
                                                {sec.location.replace("_", " ")}
                                            </div>
                                        </div>
                                    );
                                })}
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
                        {shouldReplaceSidebarInfoIcon
                            ? getWarningIndicatorIcon()
                            : canHover && getIcon()}
                        {!shouldReplaceSidebarInfoIcon && shouldShowWarningIcon && getWarningIndicatorIcon()}
                        {isSuggested && !isPlaced && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-md truncate max-w-[70px]">
                                Suggested
                            </span>
                        )}
                        {isPlaced && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md truncate max-w-[70px]">
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
                                animation: 'slideUp 0.22s cubic-bezier(0.32, 0.72, 0, 1)'
                            }}
                        >
                            {tooltipContent}
                        </div>
                    </>
                ) : (
                    // Desktop: Side tooltip
                    inSidebar ? (
                        <div
                            className="fixed z-[9999] pointer-events-auto"
                            style={{
                                top: `${tooltipPosition.top}px`,
                                left: `${Math.min(tooltipPosition.left, window.innerWidth - 550)}px`,
                                transform: 'translateY(-50%)'
                            }}
                            onMouseEnter={() => { if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current); }}
                            onMouseLeave={() => setShowTooltip(false)}
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
