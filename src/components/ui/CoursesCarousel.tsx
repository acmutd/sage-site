import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import CourseBox from '../CourseBox';

interface CoursesCarouselProps {
    courses: any[];
    type: 'suggested' | 'completed';
    placedSuggestedCourses?: Set<string>;
    categoryName?: string;
}

const CoursesCarousel: React.FC<CoursesCarouselProps> = ({
    courses,
    type,
    placedSuggestedCourses = new Set(),
    categoryName
}) => {
    const COURSES_PER_PAGE = 5;
    const [currentPage, setCurrentPage] = useState(0);
    
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

    const dotColor = type === 'suggested' ? 'bg-yellow-400' : 'bg-green-400';

    return (
        <div className="w-full">
            {/* Vertical Stack of Courses */}
            <div className="space-y-1">
                {currentCourses.map((course: any, idx: number) => {
                    if (type === 'suggested') {
                        const courseCode = course.code || course.course_code;
                        const isPlaced = placedSuggestedCourses.has(courseCode);
                        
                        return (
                            <CourseBox
                                key={`suggested-${startIndex + idx}`}
                                course={{
                                    course_code: courseCode,
                                    course_name: course.name || course.course_name,
                                    description: course.description,
                                    id: `suggested-${categoryName}-${courseCode}-${startIndex + idx}`,
                                }}
                                status="warning"
                                icon="info"
                                isSuggested={true}
                                inSidebar={true}
                                isPlaced={isPlaced}
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
        </div>
    );
};

export default CoursesCarousel;