import React, { useEffect, useState } from "react";
import { Lock, Unlock, MoreVertical, Trash2, Eraser, TriangleAlert } from "lucide-react";
import CourseBox from "./CourseBox";
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
    }>;
    currentSemesterOrder?: number;
    studentType?: 'undergrad' | 'grad';
    catalogYear?: number;
    'data-tour'?: string;
}

const normalizeCorequisiteGroups = (corequisites: unknown): string[][] => {
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
    'data-tour': dataTour
}) => {
    const [locked, setLocked] = useState(isLocked);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [courseToRemove, setCourseToRemove] = useState<string | null>(null);
    const [showWarnings, setShowWarnings] = useState(false);
    const [canHover, setCanHover] = useState(true);

    const handleLockToggle = () => {
        setLocked((prev) => !prev);
    };

    useEffect(() => {
        const checkHover = () => {
            const hoverQuery = window.matchMedia('(hover: hover)');
            setCanHover(hoverQuery.matches);
        };
        checkHover();
        
        const hoverQuery = window.matchMedia('(hover: hover)');
        const handleChange = () => checkHover();
        hoverQuery.addEventListener('change', handleChange);
        
        return () => hoverQuery.removeEventListener('change', handleChange);
    }, []);

    const getUnmetCorequisites = (): MissingRequirementItem[] | null => {
        if (!courses || courses.length === 0) return null;

        const coreqMap = new Map<string, string[][]>();
        const categoryPathMap = new Map<string, string>();
        const suggestedCourseCodes = new Set<string>();
        
        allSuggestedCourses.forEach((suggestedCourse: any) => {
            const code = normalizeCourseCode(
                suggestedCourse.code || suggestedCourse.course_code
            );
            if (code) {
                suggestedCourseCodes.add(code);
                const normalizedCoreqGroups = normalizeCorequisiteGroups(
                    suggestedCourse.corequisites
                );
                if (normalizedCoreqGroups.length > 0) {
                    coreqMap.set(code, normalizedCoreqGroups);
                }
                if (suggestedCourse.categoryPath) {
                    categoryPathMap.set(code, suggestedCourse.categoryPath);
                }
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

                const availableCoreqs = coreqGroup.filter(coreqCode => 
                    suggestedCourseCodes.has(coreqCode)
                );

                if (availableCoreqs.length === 0) return;

                const hasAnyCoreqPlanned = availableCoreqs.some(coreqCode => 
                    semesterCourseCodes.has(coreqCode)
                );

                if (!hasAnyCoreqPlanned) {
                    const locations = availableCoreqs
                        .map(coreqCode => categoryPathMap.get(coreqCode))
                        .filter((path): path is string => !!path);
                    
                    const uniqueLocations = [...new Set(locations)];
                    
                    unmetCoreqs.push({
                        course: course.course_code || courseCode,
                        missing: availableCoreqs,
                        locations: uniqueLocations
                    });
                }
            });
        });

        return unmetCoreqs.length > 0 ? unmetCoreqs : null;
    };

    const unmetCorequisites = getUnmetCorequisites();

    const getUnmetPrerequisites = (): MissingRequirementItem[] | null => {
        if (!courses || courses.length === 0) return null;

        const prerequisiteMap = new Map<string, string[][]>();
        const categoryPathMap = new Map<string, string>();

        allSuggestedCourses.forEach((suggestedCourse: any) => {
            const code = normalizeCourseCode(
                suggestedCourse.code || suggestedCourse.course_code
            );
            if (!code) return;

            const prerequisiteGroups = getCoursePrerequisiteGroups(suggestedCourse);
            if (prerequisiteGroups.length > 0) {
                prerequisiteMap.set(code, prerequisiteGroups);
            }
            if (suggestedCourse.categoryPath) {
                categoryPathMap.set(code, suggestedCourse.categoryPath);
            }
        });

        const eligiblePlannedCourseCodes =
            typeof currentSemesterOrder === "number"
                ? allPlannedCoursesWithOrder
                      .filter(
                          (plannedCourse) =>
                              plannedCourse.semesterOrder < currentSemesterOrder
                      )
                      .map((plannedCourse) => normalizeCourseCode(plannedCourse.code))
                      .filter(Boolean)
                : (allPlannedCoursesWithOrder.length > 0
                      ? allPlannedCoursesWithOrder.map((plannedCourse) =>
                            normalizeCourseCode(plannedCourse.code)
                        )
                      : allPlannedCourseCodes.map((code) =>
                            normalizeCourseCode(code)
                        )
                  ).filter(Boolean);

        const plannedCourseCodesSet = new Set(eligiblePlannedCourseCodes);
        const completedCourseCodesSet = new Set(
            allCompletedCourseCodes.map((code) => normalizeCourseCode(code)).filter(Boolean)
        );
        const satisfiedCourseCodes = new Set([
            ...plannedCourseCodesSet,
            ...completedCourseCodesSet,
        ]);

        const unmetPrereqs: MissingRequirementItem[] = [];

        courses.forEach((course) => {
            const courseCode = normalizeCourseCode(course.course_code);
            const prerequisiteGroups = prerequisiteMap.get(courseCode);
            if (!prerequisiteGroups || prerequisiteGroups.length === 0) return;

            const missingPrerequisiteGroups = getMissingPrerequisiteGroups(
                prerequisiteGroups,
                satisfiedCourseCodes
            );
            if (missingPrerequisiteGroups.length === 0) return;

            const missingPrereqLabels = missingPrerequisiteGroups.map(
                (group) => group.join(" or ")
            );

            const locations = missingPrerequisiteGroups
                .flatMap((group) => group.map((prereqCode) => categoryPathMap.get(prereqCode)))
                .filter((path): path is string => !!path);

            unmetPrereqs.push({
                course: course.course_code || courseCode,
                missing: [...new Set(missingPrereqLabels)],
                locations: [...new Set(locations)],
            });
        });

        return unmetPrereqs.length > 0 ? unmetPrereqs : null;
    };

    const unmetPrerequisites = getUnmetPrerequisites();

    const getCreditWarnings = () => {
        if (!courses || courses.length === 0) return null;
        
        const isSummer = title.toLowerCase().includes('summer');
        
        const warnings = validateCourseLoad(
            courses,
            studentType || 'undergrad',
            catalogYear || 2021,
            isSummer
        );
        
        return warnings.length > 0 ? warnings : null;
    };
    
    const creditWarnings = getCreditWarnings();

    const courseWarningsByCode = new Map<string, Warning[]>();

    const addCourseWarning = (courseCode: string, warning: Warning) => {
        const normalizedCourseCode = normalizeCourseCode(courseCode);
        const existingWarnings = courseWarningsByCode.get(normalizedCourseCode) || [];
        courseWarningsByCode.set(normalizedCourseCode, [...existingWarnings, warning]);
    };

    unmetCorequisites?.forEach((item) => {
        const details = [`Needs: ${item.missing.join(" or ")}`];
        if (item.locations.length > 0) {
            details.push(`Find in sidebar: ${item.locations.join(" / ")}`);
        }
        addCourseWarning(item.course, {
            type: "corequisite",
            severity: "warning",
            message: "Corequisite Warning:",
            details,
        });
    });

    unmetPrerequisites?.forEach((item) => {
        const details = [`Missing prerequisite(s): ${item.missing.join(", ")}`];
        if (item.locations.length > 0) {
            details.push(`Find in sidebar: ${item.locations.join(" / ")}`);
        }
        addCourseWarning(item.course, {
            type: "prerequisite",
            severity: "warning",
            message: "Prerequisite Warning:",
            details,
        });
    });

    const handleClearClick = () => {
        if (locked) {
            onShowError?.(`${title} needs to be unlocked to clear courses.`);
            return;
        }
        onClearSemester();
    }

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
            if (isFromTranscript || locked) return;
            onDropCourse(
                item.course,
                item.sourceYear,
                item.sourceSemesterIndex,
                item.courseId,
                item.isSuggested
            );
        },
        canDrop: () => !isFromTranscript && !locked,
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [locked, isFromTranscript, onDropCourse]);

    return (
        <div
            ref={!isFromTranscript ? drop : null}
            className={`
                bg-white rounded-md border border-gray-200 shadow-sm p-4 
                w-full md:w-[280px] lg:w-[317px]
                ${locked ? "opacity-75 bg-gray-50" : ""} 
                ${isOver && canDrop ? "bg-blue-50" : ""}
            `}
            data-tour={dataTour}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-800">{title}</h3>
                {!isFromTranscript && (
                    <div className="flex items-center gap-2">
                        {(unmetCorequisites || unmetPrerequisites || creditWarnings) && (
                            <div className="relative group">
                                <button
                                    onMouseEnter={canHover ? () => setShowWarnings(true) : undefined}
                                    onMouseLeave={canHover ? () => setShowWarnings(false) : undefined}
                                    onClick={() => setShowWarnings(!showWarnings)}
                                    className="hover:bg-red-50 p-1 rounded relative"
                                >
                                    <TriangleAlert className={`w-4 h-4 ${
                                        creditWarnings?.some(w => w.severity === 'error') 
                                            ? 'stroke-red-600' 
                                            : 'stroke-orange-600'
                                    }`} />
                                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        {(unmetCorequisites?.length || 0) + (unmetPrerequisites?.length || 0) + (creditWarnings?.length || 0)}
                                    </span>
                                </button>

                                {/* Desktop */}
                                {canHover && showWarnings && (
                                    <div className="absolute top-full mt-2 right-0 z-50 w-72 bg-white border-2 border-red-300 rounded-md shadow-lg p-3 max-h-96 overflow-y-auto">
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
                                                            <div className="text-xs">Missing: {item.missing.join(", ")}</div>
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
                                        {creditWarnings && (
                                            <>
                                                <div className="font-semibold mb-2 flex items-center gap-2 text-red-900">
                                                    <TriangleAlert className="w-4 h-4" />
                                                    Credit Load
                                                </div>
                                                <div className="space-y-2">
                                                    {creditWarnings.map((warning, idx) => (
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
                                    </div>
                                )}

                                {/* Mobile */}
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
                                                                <div className="text-sm">Missing: {item.missing.join(", ")}</div>
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
                                            {creditWarnings && (
                                                <>
                                                    <div className="font-semibold mb-3 flex items-center gap-2 text-red-900">
                                                        <TriangleAlert className="w-5 h-5" />
                                                        Credit Load Warnings
                                                    </div>
                                                    <div className="space-y-3">
                                                        {creditWarnings.map((warning, idx) => (
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
                            className={`hover:bg-gray-100 p-1 rounded ${
                                locked ? "text-gray-700" : "text-gray-400"
                            }`}
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
                            warnings={courseWarningsByCode.get(normalizeCourseCode(course.course_code)) || null}
                            onRemove={() => handleRemoveCourse(course.id || '')}
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