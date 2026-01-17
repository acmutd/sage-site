import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, NotebookPen, ArrowLeftFromLine, ArrowRightFromLine } from "lucide-react";
import { useDrop } from "react-dnd";
import RequirementCategory from "./RequirementCategory";
import CourseBox from "./CourseBox";

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
            suggested?: {
                code: string;
                name: string;
                corequisites: string[];
                excluded: string[];
                required_core: boolean;
                repeatable_for_hours: number;
                notes: string;
                description: string;
            }[];
        }[];
    }[];
    expandedCategories: { [key: number]: boolean };
    onToggleCategory: (index: number) => void;
    transcriptData: any;
    onDropCourse?: (courseId: string, sourceYear: string, sourceSemesterIndex: number) => void;
    isExpanded?: boolean;
    onToggleExpanded?: () => void;
    onRestartOnboarding?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    requirements,
    onDropCourse,
    isExpanded: externalIsExpanded,
    onToggleExpanded,
    onRestartOnboarding,
}) => {
    const [internalIsExpanded, setInternalIsExpanded] = useState(true);
    const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;
    const [expandedSubcategories, setExpandedSubcategories] = useState<Record<string, boolean>>({});
    const [autoExpandedCategories, setAutoExpandedCategories] = useState<{ [key: number]: boolean }>({});
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [{ isOver }, drop] = useDrop(
        () => ({
            accept: "COURSE",
            drop: (item: any) => {
                console.log("Dropped on sidebar:", item);
                if (item.courseId && item.sourceYear !== undefined && item.sourceSemesterIndex !== undefined && onDropCourse) {
                    onDropCourse(item.courseId, item.sourceYear, item.sourceSemesterIndex);
                }
            },
            collect: (monitor) => ({
                isOver: monitor.isOver(),
            }),
        }),
        [onDropCourse]
    );

    const handleToggleSidebar = () => {
        if (onToggleExpanded) {
            onToggleExpanded();
        } else {
            setInternalIsExpanded(!internalIsExpanded);
        }
    };

    useEffect(() => {
        const initialExpandedState: { [key: number]: boolean } = {};
        requirements.forEach((req, reqIdx) => {
          const hasSuggestedCourses = req.categories.some(
            (category: any) => category.suggested && category.suggested.length > 0
          );
          initialExpandedState[reqIdx] = hasSuggestedCourses;
        });
        setAutoExpandedCategories(initialExpandedState);
      }, [requirements]);
    

    const handleSavePrograms = (updatedPrograms: any[]) => {
        console.log("Updated programs:", updatedPrograms);
    };

    const handleToggleSubcategory = (reqIdx: number, catIdx: number) => {
        const key = `${reqIdx}-${catIdx}`;
        setExpandedSubcategories((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const isSubcategoryExpanded = (reqIdx: number, catIdx: number) => {
        const key = `${reqIdx}-${catIdx}`;
        return expandedSubcategories[key] !== false;
    };

    console.log(requirements[0]?.categories?.[0]?.classes);

    const renderCategories = (categories: any[], reqIdx: number, parentCatIdx: number = 0) => {
        return categories.map((category, catIdx) => {
            const currentCatIdx = `${parentCatIdx}-${catIdx}`;
            return (
                <div
                    key={currentCatIdx}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                >
                    <div
                        className="flex items-center justify-between p-2 bg-white cursor-pointer hover:bg-gray-50"
                        onClick={() => handleToggleSubcategory(reqIdx, parseInt(currentCatIdx))}
                    >
                        <div className="flex items-center gap-2">
                            {isSubcategoryExpanded(reqIdx, parseInt(currentCatIdx)) ? (
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

                    {isSubcategoryExpanded(reqIdx, parseInt(currentCatIdx)) && (
                        <div className="p-2 space-y-1">
                            {category.classes && category.classes.length > 0 ? (
                                category.classes.map((course: any, courseIdx: number) => (
                                    <CourseBox
                                        key={courseIdx}
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
                                    />
                                ))
                            ) : category.categories && category.categories.length > 0 ? null : (
                                <div className="text-sm text-gray-500">
                                    No courses in this category
                                </div>
                            )}

                            {category.suggested && category.suggested.length > 0 && (
                                <>
                                    <div className="mt-2 mb-1 border-t border-gray-100 pt-1">
                                        <span className="text-xs text-gray-500 font-medium">
                                            Suggested Courses
                                        </span>
                                    </div>
                                    {category.suggested.map((course: {
                                        code: string;
                                        name: string;
                                        corequisites: string[];
                                        excluded: string[];
                                        required_core: boolean;
                                        repeatable_for_hours: number;
                                        notes: string;
                                        description: string;
                                    }, idx: number) => (
                                        <CourseBox
                                            key={`suggested-${idx}`}
                                            course={{
                                                course_code: course.code,
                                                course_name: course.name,
                                                description: course.description,
                                            }}
                                            status="warning"
                                            icon="info"
                                            isSuggested={true}
                                        />
                                    ))}
                                </>
                            )}

                            {category.categories &&
                                category.categories.length > 0 &&
                                renderCategories(category.categories, reqIdx, parseInt(currentCatIdx))}
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <>
            <div data-tour="sidebar" className={`${isExpanded ? "w-80" : "w-20"} bg-bglight rounded-lg border border-border transition-all duration-300 flex flex-col h-full overflow-hidden`}>
                <div 
                    ref={drop}
                    className={`flex-1 overflow-y-auto ${isOver ? 'bg-gray-100' : ''}`}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {isExpanded ? (
                        <div className="p-6 pt-8">
                            <div className="flex items-center justify-between mb-6">
                                <button className="flex transition-all duration-100 items-center space-x-2 py-2 px-8 rounded-3xl bg-accent text-textdark text-base hover:text-gray-700" onClick={onRestartOnboarding}>
                                    <NotebookPen size={20} strokeWidth={2} />
                                    <span>Edit plans</span>
                                </button>
                                <button
                                    className="p-2 hover:bg-gray-200 rounded"
                                    onClick={handleToggleSidebar}
                                >
                                    <ArrowLeftFromLine className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <h2 className="text-xl font-bold text-gray-900 mb-4">
                                Degree Requirements
                            </h2>

                            <div className="space-y-3 pb-24">
                                {requirements.map((req, reqIdx) => (
                                    <RequirementCategory
                                        key={reqIdx}
                                        title={req.degree}
                                        completed={req.progress}
                                        total={req.total}
                                        isExpanded={autoExpandedCategories[reqIdx]}
                                        onToggle={() => {
                                            setAutoExpandedCategories((prev) => ({
                                            ...prev,
                                            [reqIdx]: !prev[reqIdx],
                                            }));
                                        }}
                                        hasSubcategories={req.categories && req.categories.length > 0}
                                    >
                                        {req.categories && req.categories.length > 0 ? (
                                            renderCategories(req.categories, reqIdx)
                                        ) : (
                                            <div className="text-sm text-gray-500">
                                                No categories available
                                            </div>
                                        )}
                                    </RequirementCategory>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-8 pt-8">
                            <button
                                className="p-2 hover:bg-gray-200 rounded"
                                onClick={handleToggleSidebar}
                            >
                                <ArrowRightFromLine className="w-5 h-5 text-gray-500" />
                            </button>
                            <button 
                                className="transition-all p-2 rounded-sm text-textdark border border-border bg-bglight hover:bg-border w-12 h-12 flex items-center justify-center"
                                onClick={onRestartOnboarding}
                            >
                                <NotebookPen className="w-5 h-5" strokeWidth={2} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Sidebar;