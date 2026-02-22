import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import CourseBox from '../CourseBox';
import { toast } from 'sonner';
import {
    getCoursePrerequisiteGroups,
    getMissingPrerequisiteGroups,
    normalizeCourseCode,
} from '@/utils/prerequisiteUtils';

interface CoursesCarouselProps {
    courses: any[];
    type: 'suggested' | 'completed';
    placedSuggestedCourses?: Set<string>;
    categoryName?: string;
    availableSemesters?: Array<{yearKey: string, semesterIndex: number, title: string}>;
    onAddCourse?: (targetYear: string, targetSemesterIndex: number, course: any, sourceYear: string, sourceSemesterIndex: number, courseId?: string, isSuggested?: boolean) => void;
    allSuggestedCourses?: any[];
    allCompletedCourseCodes?: string[];
    allPlannedCoursesWithOrder?: Array<{
        code: string;
        yearKey: string;
        semesterIndex: number;
        semesterOrder: number;
    }>;
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

            if (typeof group === 'string') {
                const normalized = normalizeCourseCode(group);
                return normalized ? [normalized] : [];
            }

            return [];
        })
        .filter((group: string[]) => group.length > 0);
};

const CoursesCarousel: React.FC<CoursesCarouselProps> = ({
    courses,
    type,
    placedSuggestedCourses = new Set(),
    categoryName,
    availableSemesters = [],
    onAddCourse,
    allSuggestedCourses = [],
    allCompletedCourseCodes = [],
    allPlannedCoursesWithOrder = []
}) => {
    const COURSES_PER_PAGE = 5;
    const [currentPage, setCurrentPage] = useState(0);

    // Helper function to check if a course has corequisites that are in the suggested list
    const getCorequisiteWarnings = (course: any): string[] | null => {
        const normalizedCoreqGroups = normalizeCorequisiteGroups(course.corequisites);
        if (normalizedCoreqGroups.length === 0) {
            return null;
        }

        // Create a set of all suggested course codes for quick lookup
        const suggestedCodesSet = new Set(
            allSuggestedCourses
                .map((c: any) => normalizeCourseCode(c.code || c.course_code))
                .filter(Boolean)
        );

        const warningCoreqs: string[] = [];

        // Check each corequisite group
        for (const coreqGroup of normalizedCoreqGroups) {
            // If ANY course in this group is in the suggested list, add the whole group
            const hasAnyCoreqInSuggested = coreqGroup.some((coreqCode: string) => 
                suggestedCodesSet.has(coreqCode)
            );

            if (hasAnyCoreqInSuggested) {
                // Add all courses in this group to warnings (joined with "or")
                warningCoreqs.push(coreqGroup.join(' or '));
            }
        }

        return warningCoreqs.length > 0 ? warningCoreqs : null;
    };

    const getPrerequisiteWarnings = (course: any): string[] | null => {
        const prerequisiteGroups = getCoursePrerequisiteGroups(course);
        if (prerequisiteGroups.length === 0) return null;

        const normalizedCourseCode = normalizeCourseCode(course.code || course.course_code);
        const plannedCourseOrderByCode = new Map<string, number>();

        allPlannedCoursesWithOrder.forEach((plannedCourse) => {
            const plannedCode = normalizeCourseCode(plannedCourse.code);
            if (!plannedCode) return;

            const existingOrder = plannedCourseOrderByCode.get(plannedCode);
            if (
                existingOrder === undefined ||
                plannedCourse.semesterOrder < existingOrder
            ) {
                plannedCourseOrderByCode.set(plannedCode, plannedCourse.semesterOrder);
            }
        });

        const placedSemesterOrder = plannedCourseOrderByCode.get(normalizedCourseCode);
        const eligiblePlannedCodes = allPlannedCoursesWithOrder
            .filter((plannedCourse) =>
                placedSemesterOrder === undefined
                    ? true
                    : plannedCourse.semesterOrder < placedSemesterOrder
            )
            .map((plannedCourse) => normalizeCourseCode(plannedCourse.code))
            .filter(Boolean);

        const satisfiedCourseCodes = new Set(
            [...allCompletedCourseCodes, ...eligiblePlannedCodes]
                .map((code) => normalizeCourseCode(code))
                .filter(Boolean)
        );

        const missingGroups = getMissingPrerequisiteGroups(
            prerequisiteGroups,
            satisfiedCourseCodes
        );

        if (missingGroups.length === 0) return null;
        return missingGroups.map((group) => group.join(' or '));
    };

    const totalPages = Math.ceil(courses.length / COURSES_PER_PAGE);
    const startIndex = currentPage * COURSES_PER_PAGE;
    const endIndex = startIndex + COURSES_PER_PAGE;
    const currentCourses = courses.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
    };

    const firstPage = () => goToPage(0);
    const lastPage = () => goToPage(totalPages - 1);
    const nextPage = () => goToPage(currentPage + 1);
    const prevPage = () => goToPage(currentPage - 1);

    if (courses.length === 0) {
        return (
            <div className="text-sm text-gray-500">
                No courses in this category
            </div>
        );
    }

    // phone mode
    const [showSemesterModal, setShowSemesterModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const handleAddClick = (course: any) => {
        if (availableSemesters.length === 0) {
            toast.error("Please add a semester first before adding courses");
            return;
        } else if (availableSemesters.length === 1) { // Auto-add to single semester
            const sem = availableSemesters[0];
            onAddCourse?.(sem.yearKey, sem.semesterIndex, course, '', -1, undefined, true);
            toast.success(`Added ${course.code || course.course_code} to ${sem.title}`);
        } else {
            // Show modal
            setSelectedCourse(course);
            setShowSemesterModal(true);
        }
    };

    const handleSemesterSelect = (semester: any) => {
        if (selectedCourse) {
            onAddCourse?.(semester.yearKey, semester.semesterIndex, selectedCourse, '', -1, undefined, true);
            toast.success(`Added ${selectedCourse.code || selectedCourse.course_code} to ${semester.title}`);
        }
        setShowSemesterModal(false);
        setSelectedCourse(null);
    };

    const dotColor = type === 'suggested' ? 'bg-yellow-400' : 'bg-green-400';

    return (
        <div className="w-full">
            {/* Vertical Stack of Courses */}
            <div className="space-y-1">
                {currentCourses.map((course: any, idx: number) => {
                    if (type === 'suggested') {
                        const courseCode = course.code || course.course_code;
                        const isPlaced = placedSuggestedCourses.has(courseCode);
                        const coreqWarnings = getCorequisiteWarnings(course);
                        const prerequisiteWarnings = getPrerequisiteWarnings(course);
                        const warnings = [
                            ...(coreqWarnings ? [{
                                type: 'corequisite' as const,
                                severity: 'warning' as const,
                                message: 'Corequisite Warning:',
                                details: coreqWarnings
                            }] : []),
                            ...(prerequisiteWarnings ? [{
                                type: 'prerequisite' as const,
                                severity: 'warning' as const,
                                message: 'Prerequisite Warning:',
                                details: prerequisiteWarnings
                            }] : [])
                        ];
                        const displayedWarnings =
                            isPlaced || warnings.length === 0 ? null : warnings;
                        
                        return (
                            <CourseBox
                                key={`suggested-${startIndex + idx}`}
                                course={{
                                    course_code: courseCode,
                                    course_name: course.name || course.course_name,
                                    description: course.description,
                                    credits_planned: course.credits,
                                    id: `suggested-${categoryName}-${courseCode}-${startIndex + idx}`
                                }}
                                status="warning"
                                icon="info"
                                isSuggested={true}
                                inSidebar={true}
                                isPlaced={isPlaced}
                                warnings={displayedWarnings}
                                onAdd={() => handleAddClick({...course, course_code: courseCode, code: courseCode})}
                            />
                        );
                    } else {
                        // Completed courses
                        return (
                            <CourseBox
                                key={startIndex + idx}
                                course={{
                                    course_code: course.code,
                                    credits_earned: course.credits,
                                    course_name: course.name,
                                    semester: course.semester,
                                    status: course.status,
                                }}
                                status={
                                    course.status as
                                    | "default"
                                    | "completed"
                                    | "warning"
                                    | "info"
                                    | undefined
                                }
                                icon={
                                    course.status === "completed" ? "check" : null
                                }
                                isFromTranscript={true}
                                inSidebar={true}
                            />
                        );
                    }
                })}
            </div>

            {/* Navigation Controls - more than five courses */}
            {totalPages > 1 && (
            <>
                <div className="flex items-center justify-center gap-2 mt-3">
                    {/* First Page Button - show if 3+ pages */}
                    {totalPages > 2 && (
                        <button
                            onClick={firstPage}
                            disabled={currentPage === 0}
                            className={`text-xs transition-colors ${
                                currentPage === 0 
                                    ? 'text-gray-300 cursor-not-allowed' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                            title="First page"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>
                    )}

                    {/* Previous Button */}
                    <button
                        onClick={prevPage}
                        disabled={currentPage === 0}
                        className={`text-xs transition-colors ${
                            currentPage === 0 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Previous page"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page Dots */}
                    <div className="flex gap-1.5 mx-1">
                        {Array.from({ length: totalPages }).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => goToPage(idx)}
                                className={`transition-all duration-200 ${
                                    idx === currentPage
                                        ? `w-6 h-2 rounded-full ${dotColor}`
                                        : 'w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400'
                                }`}
                                aria-label={`Go to page ${idx + 1}`}
                                title={`Page ${idx + 1}`}
                            />
                        ))}
                    </div>

                    {/* Next Button */}
                    <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages - 1}
                        className={`text-xs transition-colors ${
                            currentPage === totalPages - 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Next page"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Last Page Button - show if 3+ pages */}
                    {totalPages > 2 && (
                        <button
                            onClick={lastPage}
                            disabled={currentPage === totalPages - 1}
                            className={`text-xs transition-colors ${
                                currentPage === totalPages - 1
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                            title="Last page"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Page Counter */}
                <div className="text-center mt-2 text-xs text-gray-500">
                    Page {currentPage + 1} of {totalPages} • {courses.length} courses
                </div>
            </>
        )}
        {showSemesterModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" onClick={() => setShowSemesterModal(false)}>
                <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-sm mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold mb-4">Select Semester</h3>
                    <p className="text-sm text-gray-600 mb-4">Choose where to add {selectedCourse?.code || selectedCourse?.course_code}</p>
                    <div className="space-y-2">
                        {availableSemesters.map((sem, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSemesterSelect(sem)}
                                className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded border border-gray-200"
                            >
                                {sem.title}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => setShowSemesterModal(false)}
                        className="w-full mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )}
        </div>
    );
};

export default CoursesCarousel;