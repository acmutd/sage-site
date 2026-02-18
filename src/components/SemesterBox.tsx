import React, { useEffect, useRef, useState } from "react";
import { Lock, Unlock, MoreVertical, Trash2, Eraser, TriangleAlert, ChevronUp } from "lucide-react";
import CourseBox from "./CourseBox";
import { useDrop } from "react-dnd";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Course } from "@/types/course";
import { validateCourseLoad } from '@/utils/courseValidation';
import ReactDOM from "react-dom";

interface SemesterBoxProps {
    title: string;
    isLocked?: boolean;
    isCollapsed?: boolean;
    courses?: Course[];
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
    onToggleCollapse?: () => void;
    yearKey: string;
    semesterIndex: number;
    isFromTranscript?: boolean;
    allSuggestedCourses?: any[];
    studentType?: 'undergrad' | 'grad';
    catalogYear?: number;
    'data-tour'?: string;
}

const SemesterBox: React.FC<SemesterBoxProps> = ({
    title,
    isLocked = false,
    courses = [],
    isEmpty = false,
    isCollapsed = false,
    onToggleCollapse,
    onDropCourse,
    onClearSemester,
    onRemoveSemester,
    onShowError,
    yearKey,
    semesterIndex,
    isFromTranscript = false,
    allSuggestedCourses = [],
    studentType = 'undergrad',
    catalogYear = 2021,
    'data-tour': dataTour
}) => {
    const [locked, setLocked] = useState(isLocked);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [courseToRemove, setCourseToRemove] = useState<string | null>(null);
    const [showWarnings, setShowWarnings] = useState(false);
    const [canHover, setCanHover] = useState(true);
    const [popoverPosition, setPopoverPosition] = useState({ top: 0, right: 0 });
    const warningButtonRef = useRef<HTMLButtonElement>(null);

    const handleLockToggle = () => setLocked(prev => !prev);

    useEffect(() => {
        const hoverQuery = window.matchMedia('(hover: hover)');
        const check = () => setCanHover(hoverQuery.matches);
        check();
        hoverQuery.addEventListener('change', check);
        return () => hoverQuery.removeEventListener('change', check);
    }, []);

    useEffect(() => {
        if (showWarnings && canHover && warningButtonRef.current) {
            const rect = warningButtonRef.current.getBoundingClientRect();
            setPopoverPosition({
                top: rect.bottom + window.scrollY + 8,
                right: window.innerWidth - rect.right,
            });
        }
    }, [showWarnings, canHover]);

    const getUnmetCorequisites = () => {
        if (!courses || courses.length === 0) return null;

        const coreqMap = new Map<string, string[][]>();
        const categoryPathMap = new Map<string, string>();
        const suggestedCourseCodes = new Set<string>();

        allSuggestedCourses.forEach((suggestedCourse: any) => {
            const code = suggestedCourse.code || suggestedCourse.course_code;
            if (code) {
                suggestedCourseCodes.add(code);
                if (suggestedCourse.corequisites && Array.isArray(suggestedCourse.corequisites)) {
                    coreqMap.set(code, suggestedCourse.corequisites);
                }
                if (suggestedCourse.categoryPath) {
                    categoryPathMap.set(code, suggestedCourse.categoryPath);
                }
            }
        });

        const semesterCourseCodes = new Set(courses.map(c => c.course_code));
        const unmetCoreqs: { course: string; missing: string[]; locations: string[] }[] = [];

        courses.forEach(course => {
            const coreqs = coreqMap.get(course.course_code);
            if (!coreqs || coreqs.length === 0) return;

            coreqs.forEach((coreqGroup: string[]) => {
                if (!Array.isArray(coreqGroup) || coreqGroup.length === 0) return;

                const availableCoreqs = coreqGroup.filter(code => suggestedCourseCodes.has(code));
                if (availableCoreqs.length === 0) return;

                const hasAnyCoreqPlanned = availableCoreqs.some(code => semesterCourseCodes.has(code));
                if (!hasAnyCoreqPlanned) {
                    const locations = availableCoreqs
                        .map(code => categoryPathMap.get(code))
                        .filter((path): path is string => !!path);
                    unmetCoreqs.push({
                        course: course.course_code,
                        missing: availableCoreqs,
                        locations: [...new Set(locations)]
                    });
                }
            });
        });

        return unmetCoreqs.length > 0 ? unmetCoreqs : null;
    };

    const unmetCorequisites = getUnmetCorequisites();

    const getCreditWarnings = () => {
        if (!courses || courses.length === 0) return null;
        const isSummer = title.toLowerCase().includes('summer');
        const warnings = validateCourseLoad(courses, studentType || 'undergrad', catalogYear || 2021, isSummer);
        return warnings.length > 0 ? warnings : null;
    };

    const creditWarnings = getCreditWarnings();

    const handleClearClick = () => {
        if (locked) {
            onShowError?.(`${title} needs to be unlocked to clear courses.`);
            return;
        }
        onClearSemester();
    };

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

    const [{ isOver, canDrop, projectedWarnings }, drop] = useDrop(() => ({
        accept: "COURSE",
        drop: (item: any) => {
            if (isFromTranscript || locked) return;
            onDropCourse(item.course, item.sourceYear, item.sourceSemesterIndex, item.courseId, item.isSuggested);
        },
        canDrop: (item: any) => {
            if (isFromTranscript || locked) return false;
            const isSummer = title.toLowerCase().includes('summer');
            const projectedCourses = [...courses, item.course];
            const warnings = validateCourseLoad(projectedCourses, studentType, catalogYear, isSummer);
            return !warnings.some(w => w.severity === 'error' && w.type === 'credit_limit');
        },
        collect: (monitor) => {
            const item = monitor.getItem() as any;
            let projectedWarnings = null;
            if (monitor.isOver() && item?.course) {
                const isSummer = title.toLowerCase().includes('summer');
                const projectedCourses = [...courses, item.course];
                projectedWarnings = validateCourseLoad(projectedCourses, studentType, catalogYear, isSummer);
                if (projectedWarnings.length === 0) projectedWarnings = null;
            }
            return {
                isOver: monitor.isOver(),
                canDrop: monitor.canDrop(),
                projectedWarnings,
            };
        },
    }), [locked, isFromTranscript, onDropCourse, courses, studentType, catalogYear, title]);

    // Auto-open warning popover when drag is blocked
    useEffect(() => {
        if (isOver && !canDrop) {
            setShowWarnings(true);
        } else if (!isOver) {
            setShowWarnings(false);
        }
    }, [isOver, canDrop]);

    // Use projected warnings during hover, fall back to current warnings otherwise
    const displayedCreditWarnings = (isOver && projectedWarnings) ? projectedWarnings : creditWarnings;

    const warningPopoverContent = (
        <>
            {unmetCorequisites && (
                <>
                    <div className="font-semibold mb-2 flex items-center gap-2 text-orange-900">
                        <TriangleAlert className="w-4 h-4" />
                        Corequisites
                    </div>
                    <div className="space-y-2 mb-3">
                        {unmetCorequisites.map((item, idx) => (
                            <div key={idx} className="p-2 rounded border border-orange-200 bg-orange-50">
                                <div className="font-medium text-xs mb-1">{item.course}</div>
                                <div className="text-xs">Needs: {item.missing.join(' or ')}</div>
                                {item.locations?.length > 0 && (
                                    <div className="text-xs mt-1 pt-1 border-t border-orange-200">
                                        📍 {item.locations.map((loc: string) => {
                                            const lastPart = loc.split(' > ').pop() || loc;
                                            return lastPart.includes(':') ? lastPart.split(':')[0] : lastPart;
                                        }).join(' / ')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
            {displayedCreditWarnings && (
                <>
                    <div className="font-semibold mb-2 flex items-center gap-2 text-red-900">
                        <TriangleAlert className="w-4 h-4" />
                        Credit Load
                    </div>
                    <div className="space-y-2">
                        {displayedCreditWarnings.map((warning, idx) => (
                            <div key={idx} className="p-2 rounded border border-red-200 bg-red-50">
                                <div className="font-medium text-xs mb-1">{warning.message}</div>
                                {warning.details?.map((detail, i) => (
                                    <div key={i} className="text-xs">• {detail}</div>
                                ))}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </>
    );

    return (
        <div
            ref={!isFromTranscript ? drop : null}
            className={`
                self-start
                bg-white rounded-md border border-gray-200 shadow-sm p-4 
                w-full md:w-[280px] lg:w-[317px]
                ${locked ? "opacity-75 bg-gray-50" : ""} 
                ${isOver && canDrop ? "bg-blue-50" : ""}
                ${isOver && !canDrop ? "bg-red-50 border-red-300" : ""}
            `}
            data-tour={dataTour}
        >
            <div className="flex items-center justify-between mb-4">
                <button
                    data-tour="semester-toggle"
                    onClick={() => onToggleCollapse?.()}
                    className="flex items-center gap-1.5 group flex-1 min-w-0 text-left"
                    aria-expanded={!isCollapsed}
                    aria-label={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
                >
                    <ChevronUp
                        className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                            isCollapsed ? "-rotate-180" : "rotate-0"
                        }`}
                    />
                    <h3 className="text-base font-semibold text-gray-800 truncate">{title}</h3>
                    {isCollapsed && courses.length > 0 && (
                        <span className="ml-1.5 flex-shrink-0 text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                            {courses.length} course{courses.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </button>

                {!isFromTranscript && (
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {(unmetCorequisites || creditWarnings || (isOver && projectedWarnings)) && (
                            <div className="relative">
                                <button
                                    ref={warningButtonRef}
                                    onMouseEnter={canHover ? () => setShowWarnings(true) : undefined}
                                    onMouseLeave={canHover ? () => setShowWarnings(false) : undefined}
                                    onClick={() => setShowWarnings(prev => !prev)}
                                    className="hover:bg-red-50 p-1 rounded relative"
                                >
                                    <TriangleAlert className={`w-4 h-4 ${
                                        displayedCreditWarnings?.some(w => w.severity === 'error')
                                            ? 'stroke-red-600'
                                            : 'stroke-orange-600'
                                    }`} />
                                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        {(unmetCorequisites?.length || 0) + (displayedCreditWarnings?.length || 0)}
                                    </span>
                                </button>

                                {/* Desktop — portalled so that there's no clipping */}
                                {canHover && showWarnings && ReactDOM.createPortal(
                                    <div
                                        style={{ top: popoverPosition.top, right: popoverPosition.right }}
                                        className="fixed z-[9999] w-72 bg-white border-2 border-red-300 rounded-md shadow-lg p-3 max-h-96 overflow-y-auto"
                                        onMouseEnter={() => setShowWarnings(true)}
                                        onMouseLeave={() => setShowWarnings(false)}
                                    >
                                        {warningPopoverContent}
                                    </div>,
                                    document.body
                                )}

                                {/* Mobile — bottom sheet portal */}
                                {!canHover && showWarnings && ReactDOM.createPortal(
                                    <>
                                        <div
                                            className="fixed inset-0 bg-black bg-opacity-30 z-[9998]"
                                            onClick={() => setShowWarnings(false)}
                                        />
                                        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white text-black rounded-t-2xl p-4 shadow-2xl border-t-2 border-red-300 max-h-[80vh] overflow-y-auto">
                                            {unmetCorequisites && (
                                                <>
                                                    <div className="font-semibold mb-3 flex items-center gap-2 text-orange-900">
                                                        <TriangleAlert className="w-5 h-5" />
                                                        Corequisite Warnings
                                                    </div>
                                                    <div className="space-y-3 mb-4">
                                                        {unmetCorequisites.map((item, idx) => (
                                                            <div key={idx} className="p-3 rounded border border-orange-200 bg-orange-50">
                                                                <div className="font-medium text-sm mb-1">{item.course}</div>
                                                                <div className="text-sm">Needs: {item.missing.join(' or ')}</div>
                                                                {item.locations?.length > 0 && (
                                                                    <div className="text-sm mt-2 pt-2 border-t border-orange-200">
                                                                        📍 {item.locations.map((loc: string) => {
                                                                            const lastPart = loc.split(' > ').pop() || loc;
                                                                            return lastPart.includes(':') ? lastPart.split(':')[0] : lastPart;
                                                                        }).join(' / ')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                            {displayedCreditWarnings && (
                                                <>
                                                    <div className="font-semibold mb-3 flex items-center gap-2 text-red-900">
                                                        <TriangleAlert className="w-5 h-5" />
                                                        Credit Load Warnings
                                                    </div>
                                                    <div className="space-y-3">
                                                        {displayedCreditWarnings.map((warning, idx) => (
                                                            <div key={idx} className="p-3 rounded border border-red-200 bg-red-50">
                                                                <div className="font-medium text-sm mb-2">{warning.message}</div>
                                                                {warning.details?.map((detail, i) => (
                                                                    <div key={i} className="text-sm">• {detail}</div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </>,
                                    document.body
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleLockToggle}
                            data-tour={dataTour ? "semester-lock" : undefined}
                            className={`hover:bg-gray-100 p-1 rounded ${locked ? "text-gray-700" : "text-gray-400"}`}
                            title={locked ? "Unlock semester" : "Lock semester"}
                        >
                            {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button data-tour={dataTour ? "semester-options" : undefined} className="hover:bg-gray-100 p-1 rounded">
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

            {!isCollapsed && (
                <>
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
                                    key={course.id || `${course.course_code || 'unknown'}-${idx}`}
                                    course={course}
                                    sourceYear={yearKey}
                                    sourceSemesterIndex={semesterIndex}
                                    isFromTranscript={isFromTranscript}
                                    isLocked={locked}
                                    status={course.status as "default" | "completed" | "warning" | "info" | undefined}
                                    icon={course.icon as "check" | "warning" | "info" | null | undefined}
                                    onRemove={() => handleRemoveCourse(course.id || '')}
                                />
                            ))}
                        </div>
                    )}
                </>
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