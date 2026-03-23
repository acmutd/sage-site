import { AlertTriangle, Info, CheckCircle, GripVertical, Trash2, CirclePlus, TriangleAlert, Maximize2 } from 'lucide-react';
import { useDrag } from "react-dnd";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Course } from '@/types/course';
import { Warning } from '@/types/warning';
import SectionCard from './utdgrades/sectioncard';
import { getRMPColor } from '@/utils/grades';

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
    hideSections?: boolean;
    gradesData?: Record<string, any>;
    footnotes?: string[] | null;
    rules?: string[] | null;
    coursebookSemester?: string | null;
}

let closeActiveTooltip: (() => void) | null = null; // singleton to prevent multi-drags

const formatCoursebookSemester = (sem: string | null): string | null => {
    if (!sem) return null;
    const match = sem.match(/^(\d{2})([suf])$/);
    if (!match) return null;
    const year = `20${match[1]}`;
    const name = { s: "Spring", u: "Summer", f: "Fall" }[match[2]] ?? "";
    return `${name} ${year}`;
};

const DAY_ABBR: Record<string, string> = {
    Monday: "M", Tuesday: "Tu", Wednesday: "W", Thursday: "Th", Friday: "F", Saturday: "S"
};

const DayPips = ({ days }: { days: string }) => {
    const active = new Set(
        Array.isArray(days) ? days.map(d => String(d).trim()) : String(days).split(",").map(d => d.trim())
    );
    return (
        <div className="flex gap-1">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(d => (
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
        switch (severity) {
            case 'error': return 'bg-red-50 border-red-300 text-red-900';
            case 'warning': return 'bg-orange-50 border-orange-300 text-orange-900';
            default: return 'bg-blue-50 border-blue-300 text-blue-900';
        }
    };

    const getLocationBorderStyles = (severity: string) => {
        switch (severity) {
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
    onRemove,
    hideSections = false,
    gradesData = {},
    footnotes = [],
    rules = [],
    coursebookSemester,
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const tooltipRef = useRef<HTMLDivElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const [flipLeft, setFlipLeft] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [_, setExpandedSectionIndex] = useState<number | null>(null);
    const [isNarrowSidebar, setIsNarrowSidebar] = useState(inSidebar && window.innerWidth < 1024);

    useEffect(() => {
        if (!inSidebar) return;
        const handleResize = () => {
            const narrow = window.innerWidth < 1024;
            setIsNarrowSidebar(narrow);
            if (!narrow) setShowTooltip(false); // close drawer when expanding
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [inSidebar]);
    
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
            item: () => {
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

    useEffect(() => {
        if (!showTooltip || !tooltipRef.current) return;
        const rect = tooltipRef.current.getBoundingClientRect();
        const padding = 8;
        if (rect.right > window.innerWidth - padding) {
            setTooltipPosition(prev => ({
                ...prev,
                left: prev.left - (rect.right - window.innerWidth + padding)
            }));
        }
        if (rect.bottom > window.innerHeight - padding) {
            setTooltipPosition(prev => ({
                ...prev,
                top: prev.top - (rect.bottom - window.innerHeight + padding)
            }));
        }
    }, [showTooltip]);

    useEffect(() => {
        if (!boxRef.current) return;
        const rect = boxRef.current.getBoundingClientRect();
        setFlipLeft(rect.right + 280 > window.innerWidth);
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
        return <TriangleAlert className={`w-4 h-4 ${'stroke-red-600'
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
        if (!canHover) return;
        if (inSidebar && isNarrowSidebar) return;

        if (closeActiveTooltip) closeActiveTooltip();
        isActiveTooltipRef.current = true;
        closeActiveTooltip = () => {
            isActiveTooltipRef.current = false;
            setShowTooltip(false);
        };
    
        const rect = e.currentTarget.getBoundingClientRect();
        const tooltipWidth = sections.length > 0 ? Math.min(560, window.innerWidth * 0.9) : 264;
        const padding = 8;
    
        const spaceRight = window.innerWidth - rect.right - padding;
        const spaceLeft = rect.left - padding;
    
        // Prefer right; only flip left if it genuinely doesn't fit AND left has more room
        const goLeft = spaceRight < tooltipWidth && spaceLeft > spaceRight;
    
        const left = goLeft
            ? Math.max(padding, rect.left - tooltipWidth - 10)  // clamp so it never goes off-screen left
            : Math.min(rect.right + 10, window.innerWidth - tooltipWidth - padding); // clamp right
    
        setTooltipPosition({ top: rect.top, left });
        tooltipAnimatedRef.current = false;
        setShowTooltip(true);
    };

    const handleMouseLeave = () => {
        if (inSidebar && isNarrowSidebar) return;
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
        if (!canHover || (inSidebar && isNarrowSidebar)) {
            setShowTooltip(!showTooltip);
        }
    };

    const sections: any[] =
        (hideSections || course.status === "completed" || course.status === "in progress")
            ? []
            : (course as any).sections || [];

    const courseKey = course.course_code?.toUpperCase().replace(/\s+/g, "");
    const courseGrades = gradesData?.[courseKey];

    const getAvgLetter = (grades: Record<string, number>): string | null => {
        if (!grades) return null;
        const gradePoints: Record<string, number> = {
            "A+": 4.0, "A": 4.0, "A-": 3.7,
            "B+": 3.3, "B": 3.0, "B-": 2.7,
            "C+": 2.3, "C": 2.0, "C-": 1.7,
            "D+": 1.3, "D": 1.0, "D-": 0.7,
            "F": 0.0,
        };
        let total = 0, count = 0;
        for (const [letter, n] of Object.entries(grades)) {
            total += (gradePoints[letter] ?? 0) * n;
            count += n;
        }
        if (count === 0) return null;
        const avg = total / count;
        if (avg >= 3.85) return "A";
        if (avg >= 3.5)  return "A-";
        if (avg >= 3.15) return "B+";
        if (avg >= 2.85) return "B";
        if (avg >= 2.5)  return "B-";
        if (avg >= 2.15) return "C+";
        if (avg >= 1.85) return "C";
        return "C-";
    };

    const getGpaBadgeStyle = (avg: string) => {
        if (avg.startsWith("A")) return "bg-green-50 text-green-800";
        if (avg.startsWith("B")) return "bg-yellow-50 text-yellow-800";
        if (avg.startsWith("C")) return "bg-orange-50 text-orange-800";
        return "bg-red-50 text-red-800";
    };

    const getInstructorString = (instructors: any): string => {
        if (!instructors) return "";
        if (Array.isArray(instructors)) return instructors[0] ?? "";
        return String(instructors);
    };

    const getInstructorGrades = (instructorName: any) => {
        const nameStr = Array.isArray(instructorName)
            ? (instructorName[0] ?? "")
            : String(instructorName ?? "");
    
        if (!courseGrades?.instructors || !nameStr) return null;
    
        const normalize = (name: any): string => {
            if (!name || typeof name !== "string") return "";
            return name.toLowerCase().replace(/[^a-z\s]/g, "").trim();
        };
    
        const parseName = (name: string) => {
            if (name.includes(",")) {
                const [last, firstPart] = name.split(",").map(s => s.trim());
                const first = firstPart.split(" ")[0];
                return { first: normalize(first), last: normalize(last) };
            }
            const parts = normalize(name).split(" ");
            return { first: parts[0] ?? "", last: parts[parts.length - 1] ?? "" };
        };
    
        const input = parseName(nameStr);
    
        return courseGrades.instructors.find((inst: any) => {
            const instName = inst.instructor?.name ?? "";
            const parsed = parseName(instName);
            return input.first === parsed.first && input.last === parsed.last;
        }) ?? null;
    };

    const tooltipContent = (
        <div className={`
            ${(!canHover || isNarrowSidebar)
                ? "bg-white text-black rounded-t-2xl p-4 shadow-2xl w-full border-t-2 border-gray-200 max-h-[80vh] overflow-y-auto scrollbar-hide"
                : `bg-white text-black rounded-md p-3 shadow-lg border border-gray-200 ${sections.length > 0 ? "w-[min(560px,90vw)] max-h-[400px] overflow-y-auto" : "w-56 md:w-64"}`
            }
        `}>
            <div className="flex items-start justify-between mb-2 min-w-0 gap-2">
                <h3 className={`font-semibold ${!canHover ? "text-base" : "text-sm"} text-gray-900 truncate`}>
                    {course.course_name || "No Name Available"}
                </h3>
                <div className="flex items-center gap-1 shrink-0">
                    {coursebookSemester && sections.length > 0 && (
                        <span className="inline-flex items-center text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            {formatCoursebookSemester(coursebookSemester)} — availability differs
                        </span>
                    )}
                    {sections.length > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-700"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
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
                {course.credits_earned !== undefined && course.credits_earned !== 0 && (
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

                {((footnotes?.length ?? 0) > 0 || (rules?.length ?? 0) > 0) && (
                    <div className="mt-2 pt-2 border-t border-gray-300 space-y-1">
                        {footnotes?.map((f, i) => (
                            <p key={i} className="text-gray-500 italic">{f}</p>
                        ))}
                        {rules?.map((r, i) => (
                            <p key={i} className="text-gray-500 italic">{r}</p>
                        ))}
                    </div>
                )}

                {sections.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                        {/* Mobile: stacked cards */}
                        <div className="sm:hidden space-y-2">
                            {sections.map((sec: any, i: number) => {
                                const instData = getInstructorGrades(getInstructorString(sec.instructors));
                                const avg = instData ? getAvgLetter(instData.aggregate?.grades) : null;
                                const rmp = instData?.instructor?.rmp?.quality_rating ?? null;
                                return (
                                    <div key={i} className="border-t border-gray-100 pt-2 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-bold tracking-wide">
                                                    {sec.course_prefix?.toUpperCase() ?? ""} {sec.course_number ?? ""}.{sec.section?.trim() ?? ""}
                                                </div>
                                                <div className="text-[10px] text-gray-400">#{sec.class_number}</div>
                                            </div>
                                            <div className="flex flex-col gap-1 items-end">
                                                {avg && (
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getGpaBadgeStyle(avg)}`}>
                                                        {avg} avg
                                                    </span>
                                                )}
                                                {rmp && (() => {
                                                    const color = getRMPColor(rmp);
                                                    const isLight = (hex: string) => {
                                                        const r = parseInt(hex.slice(1,3), 16);
                                                        const g = parseInt(hex.slice(3,5), 16);
                                                        const b = parseInt(hex.slice(5,7), 16);
                                                        return (r * 0.299 + g * 0.587 + b * 0.114) > 180;
                                                    };
                                                    const textColor = isLight(color) ? '#854d0e' : color;
                                                    return (
                                                        <span
                                                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                                            style={{
                                                                color: textColor,
                                                                backgroundColor: `${color}18`,
                                                                border: `1px solid ${color}30`,
                                                            }}
                                                        >
                                                            {rmp} ★
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className="text-xs font-semibold text-gray-800">
                                            {(() => { const s = getInstructorString(sec.instructors); const first = s.split(",")[0].trim(); return s.includes(",") ? `${first} +` : first; })()}
                                        </div>
                                        <div className="text-[10px] text-gray-400">{sec.activity_type}</div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {sec.days && <DayPips days={sec.days} />}
                                            <span className="text-[10px] text-gray-500">{sec.times_12h?.split(";")[0].trim()}</span>
                                        </div>
                                        <div className={`text-xs ${sec.location === "Online" ? "text-[#5AED86] font-semibold" : "text-gray-600"}`}>
                                            {sec.location.replace("_", " ")}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop: scrollable grid */}
                        <div className="hidden sm:block overflow-x-auto scrollbar-hide">
                            <div className="grid py-1 min-w-[480px]" style={{ gridTemplateColumns: "1fr 1.2fr 1.4fr 0.8fr 0.6fr" }}>
                                {["Section", "Instructor", "Schedule", "Room", "Grades"].map((h, i) => (
                                    <span key={h} className="text-[9px] font-bold tracking-widest uppercase text-gray-400"
                                        style={{ textAlign: i === 4 ? "right" : "left" }}>
                                        {h}
                                    </span>
                                ))}
                            </div>
                            {sections.map((sec: any, i: number) => {
                                const instData = getInstructorGrades(sec.instructors);
                                const avg = instData ? getAvgLetter(instData.aggregate?.grades) : null;
                                const rmp = instData?.instructor?.rmp?.quality_rating ?? null;
                                return (
                                    <div key={i} className="grid py-2 items-center border-t border-gray-100 min-w-[480px]"
                                        style={{ gridTemplateColumns: "1fr 1.2fr 1.4fr 0.8fr 0.6fr" }}>
                                        <div>
                                            <div className="text-xs font-bold tracking-wide">
                                                {sec.course_prefix?.toUpperCase() ?? ""} {sec.course_number ?? ""}.{sec.section?.trim() ?? ""}
                                            </div>
                                            <div className="text-[10px] text-gray-400">#{sec.class_number}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-gray-800 truncate max-w-[90px]" title={sec.instructors}>
                                               {(() => { const s = getInstructorString(sec.instructors); const first = s.split(",")[0].trim(); return s.includes(",") ? `${first} +` : first; })()}
                                            </div>
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
                                        <div className="flex flex-col gap-1 items-end">
                                            {avg && (
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getGpaBadgeStyle(avg)}`}>
                                                    {avg} avg
                                                </span>
                                            )}
                                            {rmp && (() => {
                                                    const color = getRMPColor(rmp);
                                                    const isLight = (hex: string) => {
                                                        const r = parseInt(hex.slice(1,3), 16);
                                                        const g = parseInt(hex.slice(3,5), 16);
                                                        const b = parseInt(hex.slice(5,7), 16);
                                                        return (r * 0.299 + g * 0.587 + b * 0.114) > 180;
                                                    };
                                                    const textColor = isLight(color) ? '#854d0e' : color;
                                                    return (
                                                        <span
                                                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                                            style={{
                                                                color: textColor,
                                                                backgroundColor: `${color}18`,
                                                                border: `1px solid ${color}30`,
                                                            }}
                                                        >
                                                            {rmp} ★
                                                        </span>
                                                    );
                                            })()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div ref={boxRef} className={`${inSidebar ? "relative" : "group relative"} ${flipLeft ? "near-right-edge" : ""}`}>
                <div
                    ref={dragRef}
                    className={`flex items-center justify-between p-3 rounded-md border-2 ${getStatusStyles()} 
                    transition-all hover:shadow-sm ${isDragging ? "opacity-50" : ""} 
                    ${isFromTranscript || isPlaced ? "cursor-default" : "cursor-grab"}`}
                    onMouseEnter={canHover ? handleMouseEnter : undefined}
                    onMouseLeave={canHover ? handleMouseLeave : undefined}
                >
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                        {isMobile ? (
                            <>
                                {inSidebar && onAdd && !isPlaced && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAdd();
                                        }}
                                    ><CirclePlus className="w-4 h-4 mr-2" />
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
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                        {shouldReplaceSidebarInfoIcon
                            ? getWarningIndicatorIcon()
                            : (canHover && !(inSidebar && isNarrowSidebar)) && getIcon()}
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
                        {(!canHover || (inSidebar && isNarrowSidebar)) && (
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
                        <div className="hidden xl:block absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[999] opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none
                            [.near-right-edge_&]:left-auto [.near-right-edge_&]:right-full [.near-right-edge_&]:ml-0 [.near-right-edge_&]:mr-3">
                            {tooltipContent}
                        </div>
                        <div className="block xl:hidden absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-[999] opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none">
                            {tooltipContent}
                        </div>
                    </>
                )}
            </div>

            {/* Tooltip for sidebar (portal) */}
            {((inSidebar && showTooltip) || (!canHover && showTooltip)) && ReactDOM.createPortal(
                (!canHover || isNarrowSidebar) ? (
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
                            ref={tooltipRef}
                            className="fixed z-[9999] pointer-events-auto"
                            style={{
                                top: `${tooltipPosition.top}px`,
                                left: `${tooltipPosition.left}px`,
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

            {showModal && ReactDOM.createPortal(
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-[10000]"
                        onClick={() => { setShowModal(false); setExpandedSectionIndex(null); }}
                    />
                    <div className="fixed inset-4 md:inset-12 bg-white rounded-2xl z-[10001] flex flex-col shadow-2xl overflow-hidden max-w-full">
                        <div className="flex items-start justify-between p-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">{course.course_name}</h2>
                                <p className="text-sm text-gray-500 mt-0.5">{course.course_code} · {sections.length} section{sections.length !== 1 ? "s" : ""}</p>
                            </div>
                            <button
                                onClick={() => { setShowModal(false); setExpandedSectionIndex(null); }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                            >✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto overflow-x-auto p-6 space-y-3">
                            <div className="overflow-x-auto">
                                {sections.map((sec: any, i: number) => {
                                    const instData = getInstructorGrades(getInstructorString(sec.instructors));
                                    return (
                                        <SectionCard
                                            key={i}
                                            sec={sec}
                                            instData={instData ?? null}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}

        </>
    );
};

export default CourseBox;
