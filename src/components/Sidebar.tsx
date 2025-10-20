import React, { useState } from "react";
import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import RequirementCategory from "./RequirementCategory";
import CourseBox from "./CourseBox";

// Sidebar Component
interface SidebarProps {
    requirements: {
        degree: string;
        progress: number;
        total: number;
        credits_completed: number;
        credits: number;
        categories: {
            name: string;
            progress: number;
            total: number;
            credits_completed: number;
            credits: number;
            classes: {
                code: string;
                name: string;
                credits: number;
                status?: string;
                semester?: string;
            }[];
            categories?: any[];
            suggested?: string[];
        }[];
    }[];
    expandedCategories: { [key: number]: boolean };
    onToggleCategory: (index: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    requirements,
    expandedCategories,
    onToggleCategory,
}) => {
    const [isExpanded, setIsExpanded] = useState(true); // Track sidebar expansion state
    const [expandedSubcategories, setExpandedSubcategories] = useState<Record<string, boolean>>({});

    const handleToggleSidebar = () => {
        setIsExpanded((prev) => !prev); // Toggle sidebar state
    };

    const handleToggleSubcategory = (reqIdx: number, catIdx: number) => {
        const key = `${reqIdx}-${catIdx}`;
        setExpandedSubcategories(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Check if a subcategory is expanded
    const isSubcategoryExpanded = (reqIdx: number, catIdx: number) => {
        const key = `${reqIdx}-${catIdx}`;
        // Default to true if not explicitly set
        return expandedSubcategories[key] !== false;
    };

    return (
        <div
            className={`${isExpanded ? "w-80" : "w-20"
                } bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto h-screen transition-all duration-300`}
        >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between mb-6">
                {isExpanded && (
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-400 hover:bg-green-500 rounded-full transition-colors">
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                        </svg>
                        <span className="text-sm font-medium">Edit plans</span>
                    </button>
                )}
                <button
                    className="p-2 hover:bg-gray-200 rounded"
                    onClick={handleToggleSidebar}
                >
                    {isExpanded ? (
                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                </button>
            </div>

            {/* Sidebar Content */}
            {isExpanded && (
                <>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Degree Requirements
                    </h2>

                    <div className="space-y-3">
                        {requirements.map((req, reqIdx) => (
                            <RequirementCategory
                                key={reqIdx}
                                title={req.degree}
                                completed={req.progress}
                                total={req.total}
                                isExpanded={expandedCategories[reqIdx]}
                                onToggle={() => onToggleCategory(reqIdx)}
                                hasSubcategories={req.categories && req.categories.length > 0}
                            >
                                {req.categories && req.categories.length > 0 ? (
                                    // Map through categories instead of subcategories
                                    req.categories.map((category, catIdx) => (
                                        <div
                                            key={catIdx}
                                            className="border border-gray-200 rounded-lg overflow-hidden"
                                        >
                                            <div
                                                className="flex items-center justify-between p-2 bg-white cursor-pointer hover:bg-gray-50"
                                                onClick={() => handleToggleSubcategory(reqIdx, catIdx)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isSubcategoryExpanded(reqIdx, catIdx) ? (
                                                        <ChevronDown className="w-3 h-3" />
                                                    ) : (
                                                        <ChevronRight className="w-3 h-3" />
                                                    )}
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {category.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-600">
                                                        {category.progress}/{category.total}
                                                    </span>
                                                    <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
                                                </div>
                                            </div>

                                            {isSubcategoryExpanded(reqIdx, catIdx) && (
                                                <div className="p-2 space-y-1">
                                                    {/* Map through classes array */}
                                                    {category.classes && category.classes.length > 0 ? (
                                                        category.classes.map((course, courseIdx) => (
                                                            <CourseBox
                                                                key={courseIdx}
                                                                course={course}
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
                                                            />
                                                        ))
                                                    ) : (
                                                        <div className="text-sm text-gray-500">No courses in this category</div>
                                                    )}

                                                    {category.suggested && category.suggested.length > 0 && (
                                                        <>
                                                            <div className="mt-2 mb-1 border-t border-gray-100 pt-1">
                                                                <span className="text-xs text-gray-500 font-medium">Suggested Courses</span>
                                                            </div>
                                                            {category.suggested.map((courseCode, idx) => (
                                                                <CourseBox
                                                                    key={`suggested-${idx}`}
                                                                    course={{ code: courseCode }}
                                                                    status="warning"
                                                                    icon="info"
                                                                    isSuggested={true}
                                                                />
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-gray-500">No courses in this category</div>
                                )}
                            </RequirementCategory>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default Sidebar;