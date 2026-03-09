import React, { useEffect, useRef, useState } from "react";
import { Lock, Unlock, MoreVertical, Trash2, Eraser, TriangleAlert, ChevronUp } from "lucide-react";
import CourseBox from "@/components/planner/CourseBox";
import { useDrop } from "react-dnd";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Course } from "@/types/course";
import { validateCourseLoad } from '@/utils/courseValidation';
import { Warning } from "@/types/warning";
import {
    getCoursePrerequisiteGroups,
    getMissingPrerequisiteGroups,
    normalizeCourseCode,
} from "@/utils/prerequisiteUtils";
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
    allCompletedCourseCodes?: string[];
    allPlannedCourseCodes?: string[];
    allPlannedCoursesWithOrder?: Array<{
        code: string;
        yearKey: string;
        semesterIndex: number;
        semesterOrder: number;
        semesterTitle?: string;
    }>;
    currentSemesterOrder?: number;
    studentType?: 'undergrad' | 'grad';
    catalogYear?: number;
    'data-tour'?: string;
    isCurrentSemester?: boolean;
}

const normalizeCorequisiteGroups = (corequisites: unknown): string[][] => {
    if (corequisites == null) return [];
    if (typeof corequisites === "string") {
        const normalized = normalizeCourseCode(corequisites);
        return normalized ? [[normalized]] : [];
    }
    if (!Array.isArray(corequisites)) return [];

    return corequisites
        .map((group: unknown) => {
            if (Array.isArray(group)) {
                return group
                    .map((code: unknown) => normalizeCourseCode(code))
                    .filter(Boolean);
            }

            if (typeof group === "string") {
                const normalized = normalizeCourseCode(group);
                return normalized ? [normalized] : [];
            }

            return [];
        })
        .filter((group: string[]) => group.length > 0);
};

type MissingRequirementItem = {
    course: string;
    missing: string[];
    locations: string[];
};

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
    allCompletedCourseCodes = [],
    allPlannedCourseCodes = [],
    allPlannedCoursesWithOrder = [],
    currentSemesterOrder,
    studentType = 'undergrad',
    catalogYear = 2021,
    'data-tour': dataTour,
    isCurrentSemester = false,
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

    useEffect(() => {
        if (showWarnings && canHover && warningButtonRef.current) {
            const rect = warningButtonRef.current.getBoundingClientRect();
            setPopoverPosition({
                top: rect.bottom + window.scrollY + 8,
                right: window.innerWidth - rect.right,
            });
        }
    }, [showWarnings, canHover]);

    const plannedSemestersByCode = new Map<string, string[]>();
    if (allPlannedCoursesWithOrder.length > 0) {
        allPlannedCoursesWithOrder.forEach((plannedCourse) => {
            const plannedCode = normalizeCourseCode(plannedCourse.code);
            if (!plannedCode) return;

            const semesterTitle = String(plannedCourse.semesterTitle || "").trim();
            if (!semesterTitle) return;

            const existingTitles = plannedSemestersByCode.get(plannedCode) || [];
            if (!existingTitles.includes(semesterTitle)) {
                existingTitles.push(semesterTitle);
                plannedSemestersByCode.set(plannedCode, existingTitles);
            }
        });
    }

    const getPreferredLocationsForCourse = (
        requiredCourseCode: string,
        sidebarLocation?: string
    ): string[] => {
        const plannedSemesterLocations =
            plannedSemestersByCode.get(normalizeCourseCode(requiredCourseCode)) || [];
        if (plannedSemesterLocations.length > 0) {
            return plannedSemesterLocations;
        }

        if (sidebarLocation) return [sidebarLocation];
        return [];
    };

    const getUnmetCorequisites = (): MissingRequirementItem[] | null => {
        if (!courses || courses.length === 0) return null;

        const coreqMap = new Map<string, string[][]>();
        const categoryPathMap = new Map<string, string>();
        const suggestedCourseCodes = new Set<string>();

        const indexCoreqSource = (source: any, code: string) => {
            suggestedCourseCodes.add(code);
            const normalizedCoreqGroups = normalizeCorequisiteGroups(source.corequisites);
            if (normalizedCoreqGroups.length > 0 && !coreqMap.has(code)) {
                coreqMap.set(code, normalizedCoreqGroups);
            }
            if (source.categoryPath && !categoryPathMap.has(code)) {
                categoryPathMap.set(code, source.categoryPath);
            }
        };

        allSuggestedCourses.forEach((suggestedCourse: any) => {
            const code = normalizeCourseCode(suggestedCourse.code || suggestedCourse.course_code);
            if (code) indexCoreqSource(suggestedCourse, code);
        });

        // Also check the courses within the current semester to preserve data after refresh/reload
        courses.forEach((course: any) => {
            const code = normalizeCourseCode(course.course_code);
            if (code && !coreqMap.has(code) && course.corequisites) {
                indexCoreqSource(course, code);
            }
        });

        const semesterCourseCodes = new Set(
            courses.map((c) => normalizeCourseCode(c.course_code))
        );

        const unmetCoreqs: MissingRequirementItem[] = [];

        courses.forEach(course => {
            const courseCode = normalizeCourseCode(course.course_code);
            const coreqs = coreqMap.get(courseCode);
            if (!coreqs || coreqs.length === 0) return;

            coreqs.forEach((coreqGroup: string[]) => {
                if (!Array.isArray(coreqGroup) || coreqGroup.length === 0) return;

                const availableCoreqs = coreqGroup.filter(code => suggestedCourseCodes.has(code));
                if (availableCoreqs.length === 0) return;

                const hasAnyCoreqPlanned = availableCoreqs.some(code => semesterCourseCodes.has(code));
                if (!hasAnyCoreqPlanned) {
                    const locations = availableCoreqs
                        .flatMap((coreqCode) =>
                            getPreferredLocationsForCourse(
                                coreqCode,
                                categoryPathMap.get(coreqCode)
                            )
                        )
                        .filter(Boolean);
                    unmetCoreqs.push({
                        course: course.course_code || courseCode,
                        missing: availableCoreqs,
                        locations: [...new Set(locations)]
                    });
                }
            });
        });

        return unmetCoreqs.length > 0 ? unmetCoreqs : null;
    };

    const unmetCorequisites = getUnmetCorequisites();

    const getPrerequisiteFindings = (): {
        collisions: MissingRequirementItem[] | null;
        unmet: MissingRequirementItem[] | null;
    } => {
        if (!courses || courses.length === 0) return { collisions: null, unmet: null };

        const prerequisiteMap = new Map<string, string[][]>();
        const categoryPathMap = new Map<string, string>();

        const indexPrereqSource = (source: any, code: string) => {
            const prerequisiteGroups = getCoursePrerequisiteGroups(source);
            if (prerequisiteGroups.length > 0 && !prerequisiteMap.has(code)) {
                prerequisiteMap.set(code, prerequisiteGroups);
            }
            if (source.categoryPath && !categoryPathMap.has(code)) {
                categoryPathMap.set(code, source.categoryPath);
            }
        };

        allSuggestedCourses.forEach((suggestedCourse: any) => {
            const code = normalizeCourseCode(suggestedCourse.code || suggestedCourse.course_code);
            if (code) indexPrereqSource(suggestedCourse, code);
        });

        // Also check the courses within the current semester to preserve data after refresh/reload
        courses.forEach((course: any) => {
            const code = normalizeCourseCode(course.course_code);
            if (code && !prerequisiteMap.has(code)) {
                indexPrereqSource(course, code);
            }
        });

        const sameSemesterCourseCodesSet = new Set(
            courses.map((course) => normalizeCourseCode(course.course_code)).filter(Boolean)
        );
        const earlierPlannedCourseCodesSet = new Set<string>();

        if (
            typeof currentSemesterOrder === "number" &&
            allPlannedCoursesWithOrder.length > 0
        ) {
            allPlannedCoursesWithOrder.forEach((plannedCourse) => {
                const plannedCode = normalizeCourseCode(plannedCourse.code);
                if (!plannedCode) return;
                if (plannedCourse.semesterOrder < currentSemesterOrder) {
                    earlierPlannedCourseCodesSet.add(plannedCode);
                }
            });
        } else {
            allPlannedCourseCodes
                .map((code) => normalizeCourseCode(code))
                .filter(Boolean)
                .forEach((code) => {
                    if (!sameSemesterCourseCodesSet.has(code)) {
                        earlierPlannedCourseCodesSet.add(code);
                    }
                });
        }

        const completedCourseCodesSet = new Set(
            allCompletedCourseCodes.map((code) => normalizeCourseCode(code)).filter(Boolean)
        );
        const satisfiedCourseCodes = new Set([
            ...earlierPlannedCourseCodesSet,
            ...completedCourseCodesSet,
        ]);

        const unmetPrereqs: MissingRequirementItem[] = [];
        const collisionPrereqs: MissingRequirementItem[] = [];

        courses.forEach((course) => {
            const courseCode = normalizeCourseCode(course.course_code);
            const prerequisiteGroups = prerequisiteMap.get(courseCode);
            if (!prerequisiteGroups || prerequisiteGroups.length === 0) return;

            const missingPrerequisiteGroups = getMissingPrerequisiteGroups(
                prerequisiteGroups,
                satisfiedCourseCodes
            );
            if (missingPrerequisiteGroups.length === 0) return;

            const collisionGroups = missingPrerequisiteGroups.filter((group) =>
                group.some((prereqCode) => sameSemesterCourseCodesSet.has(prereqCode))
            );
            const unmetGroups = missingPrerequisiteGroups.filter(
                (group) =>
                    !group.some((prereqCode) => sameSemesterCourseCodesSet.has(prereqCode))
            );

            if (collisionGroups.length > 0) {
                const collisionLabels = collisionGroups.map((group) => group.join(" or "));
                const collisionLocations = collisionGroups
                    .flatMap((group) =>
                        group.flatMap((prereqCode) =>
                            getPreferredLocationsForCourse(
                                prereqCode,
                                categoryPathMap.get(prereqCode)
                            )
                        )
                    )
                    .filter(Boolean);

                collisionPrereqs.push({
                    course: course.course_code || courseCode,
                    missing: [...new Set(collisionLabels)],
                    locations: [...new Set(collisionLocations)],
                });
            }

            if (unmetGroups.length > 0) {
                const unmetLabels = unmetGroups.map((group) => group.join(" or "));
                const unmetLocations = unmetGroups
                    .flatMap((group) =>
                        group.flatMap((prereqCode) =>
                            getPreferredLocationsForCourse(
                                prereqCode,
                                categoryPathMap.get(prereqCode)
                            )
                        )
                    )
                    .filter(Boolean);

                unmetPrereqs.push({
                    course: course.course_code || courseCode,
                    missing: [...new Set(unmetLabels)],
                    locations: [...new Set(unmetLocations)],
                });
            }
        });

        return {
            collisions: collisionPrereqs.length > 0 ? collisionPrereqs : null,
            unmet: unmetPrereqs.length > 0 ? unmetPrereqs : null,
        };
    };

    const prerequisiteFindings = getPrerequisiteFindings();
    const prerequisiteCollisions = prerequisiteFindings.collisions;
    const unmetPrerequisites = prerequisiteFindings.unmet;

    const getCreditWarnings = () => {
        if (!courses || courses.length === 0) return null;
        const isSummer = title.toLowerCase().includes('summer');
        const warnings = validateCourseLoad(courses, studentType || 'undergrad', catalogYear || 2021, isSummer);
        return warnings.length > 0 ? warnings : null;
    };


    const creditWarnings = getCreditWarnings();

    const courseWarningsByCode = new Map<string, Warning[]>();

    const addCourseWarning = (courseCode: string, warning: Warning) => {
        const normalizedCourseCode = normalizeCourseCode(courseCode);
        const existingWarnings = courseWarningsByCode.get(normalizedCourseCode) || [];
        courseWarningsByCode.set(normalizedCourseCode, [...existingWarnings, warning]);
    };

    prerequisiteCollisions?.forEach((item) => {
        const details = [`Same semester as prerequisite: ${item.missing.join(", ")}`];
        addCourseWarning(item.course, {
            type: "conflict",
            severity: "warning",
            message: "Collision Warning:",
            details,
        });
    });

    unmetPrerequisites?.forEach((item) => {
        const details = item.missing.map(
            (missingPrerequisite) =>
                `${missingPrerequisite} must be taken before ${item.course}`
        );
        if (item.locations.length > 0) {
            details.push(`Location: ${item.locations.join(" / ")}`);
        }
        addCourseWarning(item.course, {
            type: "prerequisite",
            severity: "warning",
            message: "Prerequisite Warning:",
            details,
        });
    });

    unmetCorequisites?.forEach((item) => {
        const details = [`Needs: ${item.missing.join(" or ")}`];
        if (item.locations.length > 0) {
            details.push(`Location: ${item.locations.join(" / ")}`);
        }
        addCourseWarning(item.course, {
            type: "corequisite",
            severity: "warning",
            message: "Corequisite Warning:",
            details,
        });
    });

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
                ${isCurrentSemester ? "ring-2 ring-green-400" : ""}
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
                        {(prerequisiteCollisions || unmetPrerequisites || unmetCorequisites || creditWarnings || (isOver && projectedWarnings)) && (
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
                                        {(prerequisiteCollisions?.length || 0) + (unmetPrerequisites?.length || 0) + (unmetCorequisites?.length || 0) + (displayedCreditWarnings?.length || 0)}
                                    </span>
                                </button>

                                {/* Desktop — portalled to avoid clipping */}
                                {canHover && showWarnings && ReactDOM.createPortal(
                                    <div
                                        style={{ top: popoverPosition.top, right: popoverPosition.right }}
                                        className="fixed z-[9999] w-72 bg-white border-2 border-red-300 rounded-md shadow-lg p-3 max-h-96 overflow-y-auto"
                                        onMouseEnter={() => setShowWarnings(true)}
                                        onMouseLeave={() => setShowWarnings(false)}
                                    >
                                        {prerequisiteCollisions && (
                                            <>
                                                <div className="font-semibold mb-2 flex items-center gap-2 text-orange-900">
                                                    <TriangleAlert className="w-4 h-4" />
                                                    Collisions
                                                </div>
                                                <div className="space-y-2 mb-3">
                                                    {prerequisiteCollisions.map((item, idx) => (
                                                        <div key={idx} className="p-2 rounded border border-orange-200 bg-orange-50">
                                                            <div className="font-medium text-xs mb-1">{item.course}</div>
                                                            <div className="text-xs">Same semester as prerequisite: {item.missing.join(", ")}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        {unmetPrerequisites && (
                                            <>
                                                <div className="font-semibold mb-2 flex items-center gap-2 text-orange-900">
                                                    <TriangleAlert className="w-4 h-4" />
                                                    Prerequisites
                                                </div>
                                                <div className="space-y-2 mb-3">
                                                    {unmetPrerequisites.map((item, idx) => (
                                                        <div key={idx} className="p-2 rounded border border-orange-200 bg-orange-50">
                                                            <div className="font-medium text-xs mb-1">{item.course}</div>
                                                            <div className="text-xs">
                                                                {item.missing
                                                                    .map((missingPrerequisite) => `${missingPrerequisite} must be taken before ${item.course}`)
                                                                    .join(" AND ")}
                                                            </div>
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
                                        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white text-black rounded-t-2xl p-4 shadow-2xl border-t-2 border-red-300 max-h-[calc(100vh-3rem)] overflow-y-auto">
                                            {prerequisiteCollisions && (
                                                <>
                                                    <div className="font-semibold mb-3 flex items-center gap-2 text-orange-900">
                                                        <TriangleAlert className="w-5 h-5" />
                                                        Collision Warnings
                                                    </div>
                                                    <div className="space-y-3 mb-4">
                                                        {prerequisiteCollisions.map((item, idx) => (
                                                            <div key={idx} className="p-3 rounded border border-orange-200 bg-orange-50">
                                                                <div className="font-medium text-sm mb-1">{item.course}</div>
                                                                <div className="text-sm">Same semester as prerequisite: {item.missing.join(", ")}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                            {unmetPrerequisites && (
                                                <>
                                                    <div className="font-semibold mb-3 flex items-center gap-2 text-orange-900">
                                                        <TriangleAlert className="w-5 h-5" />
                                                        Prerequisite Warnings
                                                    </div>
                                                    <div className="space-y-3 mb-4">
                                                        {unmetPrerequisites.map((item, idx) => (
                                                            <div key={idx} className="p-3 rounded border border-orange-200 bg-orange-50">
                                                                <div className="font-medium text-sm mb-1">{item.course}</div>
                                                                <div className="text-sm">
                                                                    {item.missing
                                                                        .map((missingPrerequisite) => `${missingPrerequisite} must be taken before ${item.course}`)
                                                                        .join(" AND ")}
                                                                </div>
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
                            {courses.map((course, idx) => {
                                const normalizedCourseCode = normalizeCourseCode(course.course_code);
                                const courseWarnings =
                                    courseWarningsByCode.get(normalizedCourseCode) || [];
                                const isPlannedCourse =
                                    String(course.status || "").toLowerCase() === "planned";
                                const hasWarningBorder = isPlannedCourse && courseWarnings.length > 0;

                                return (
                                    <CourseBox
                                        key={course.id || `${course.course_code || 'unknown'}-${idx}`}
                                        course={course}
                                        sourceYear={yearKey}
                                        sourceSemesterIndex={semesterIndex}
                                        isFromTranscript={isFromTranscript}
                                        isLocked={locked}
                                        status={course.status as "default" | "completed" | "warning" | "info" | undefined}
                                        icon={course.icon as "check" | "warning" | "info" | null | undefined}
                                        warnings={courseWarnings.length > 0 ? courseWarnings : null}
                                        hasWarningBorder={hasWarningBorder}
                                        onRemove={() => handleRemoveCourse(course.id || '')}
                                    />
                                );
                            })}
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
