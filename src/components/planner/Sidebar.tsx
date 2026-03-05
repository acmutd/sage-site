import React, { useState, useEffect } from "react";
import { NotebookPen, ArrowLeftToLine, PanelLeftDashed, ArrowRightToLine } from "lucide-react";
import { useDrop } from "react-dnd";
import RequirementCategory from "./planner/RequirementCategory";
import CoursesCarousel from "./planner/CoursesCarousel";

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
    placedSuggestedCourses?: Set<string>;
    allCompletedCourseCodes?: string[];
    allPlannedCoursesWithOrder?: Array<{
        code: string;
        yearKey: string;
        semesterIndex: number;
        semesterOrder: number;
    }>;
    onRestartOnboarding?: () => void;
    focusLabel?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
    requirements,
    onDropCourse,
    isExpanded: externalIsExpanded,
    onToggleExpanded,
    placedSuggestedCourses = new Set(),
    allCompletedCourseCodes = [],
    allPlannedCoursesWithOrder = [],
    onRestartOnboarding,
    focusLabel,
}) => {
    const [internalIsExpanded, setInternalIsExpanded] = useState(true);
    const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;
    const [expandedSubcategories, setExpandedSubcategories] = useState<Record<string, boolean>>({});
    const [autoExpandedCategories, setAutoExpandedCategories] = useState<{ [key: number]: boolean }>({});
    const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

    // Collect all suggested courses from all categories with their category paths
    const allSuggestedCourses = React.useMemo(() => {
        const courses: any[] = [];
        
        const collectSuggestedCourses = (categories: any[], parentPath: string[] = []) => {
            if (!categories) return;
            
            categories.forEach((category) => {
                const currentPath = [...parentPath, category.name];
                
                if (category.suggested && category.suggested.length > 0) {
                    // Add category location to each suggested course
                    const coursesWithLocation = category.suggested.map((course: any) => ({
                        ...course,
                        categoryPath: currentPath.join(' > ')
                    }));
                    courses.push(...coursesWithLocation);
                }
                if (category.categories && category.categories.length > 0) {
                    collectSuggestedCourses(category.categories, currentPath);
                }
            });
        };
        
        requirements.forEach((req) => {
            if (req.categories) {
                collectSuggestedCourses(req.categories, [req.degree]);
            }
        });
        
        return courses;
    }, [requirements]);

    const [{ isOver }, drop] = useDrop(
        () => ({
            accept: "COURSE",
            drop: (item: any) => {
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

    // parent category
    useEffect(() => {
        const initialExpandedState: { [key: number]: boolean } = {};
        requirements.forEach((req, reqIdx) => {
            const isIncomplete = req.progress < req.total;
            const hasSuggestedCourses = req.categories.some(
                (category: any) => category.suggested && category.suggested.length > 0
            );
            const hasContent = req.categories && req.categories.length > 0;
            initialExpandedState[reqIdx] = (isIncomplete && hasContent) || hasSuggestedCourses;
        });
        setAutoExpandedCategories(initialExpandedState);
      }, [requirements]);
    
      useEffect(() => {
        const initialState: Record<string, boolean> = {};
        
        const initializeCategories = (categories: any[], reqIdx: number, parentIdx: string = "0") => {
            categories.forEach((category, catIdx) => {
                const key = `${reqIdx}-${parentIdx}-${catIdx}`;
                // Auto-expand if category has any progress
                initialState[key] = category.progress < category.total && category.total > 0;
                
                // Recursively initialize nested categories
                if (category.categories && category.categories.length > 0) {
                    initializeCategories(category.categories, reqIdx, `${parentIdx}-${catIdx}`);
                }
            });
        };
        
        requirements.forEach((req, reqIdx) => {
            if (req.categories && req.categories.length > 0) {
                initializeCategories(req.categories, reqIdx);
            }
        });
        
        setExpandedSubcategories(initialState);
    }, [requirements]);
    
    // profile -> planner hotlink
    useEffect(() => {
        if (!focusLabel) return;
    
        const newExpanded = { ...expandedSubcategories };
        let foundKey: string | null = null;
    
        const findAndExpand = (categories: any[], reqIdx: number, parentPath: string = "0"): boolean => {
            return categories.some((category, catIdx) => {
                const key = `${reqIdx}-${parentPath}-${catIdx}`;
    
                if (category.name.includes(focusLabel)) {
                    foundKey = key;
                    // don't touch newExpanded[key] — don't expand the target itself
                    return true;
                }
    
                const childMatched = category.categories?.length
                    ? findAndExpand(category.categories, reqIdx, `${parentPath}-${catIdx}`)
                    : false;
    
                if (childMatched) {
                    newExpanded[key] = true; // expand ancestor only
                }
    
                return childMatched;
            });
        };
    
        requirements.forEach((req, reqIdx) => {
            const matched = findAndExpand(req.categories, reqIdx);
            if (matched) setAutoExpandedCategories(prev => ({ ...prev, [reqIdx]: true }));
        });
    
        setExpandedSubcategories(newExpanded);
        if (foundKey) setHighlightedKey(foundKey);
    }, [focusLabel]);
    
    useEffect(() => {
        if (!highlightedKey) return;
        const el = document.querySelector(`[data-category-key="${highlightedKey}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        const timer = setTimeout(() => setHighlightedKey(null), 2000);
        return () => clearTimeout(timer);
    }, [highlightedKey]);
    
    const handleToggleSubcategory = (key: string) => {
        setExpandedSubcategories((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // Helper function to check if a category has any completion/progress
    const hasCompletion = (category: any): boolean => {
        // Check if the category itself has progress
        if (category.progress > 0) return true;
        
        // Check if any classes are completed
        if (category.classes && category.classes.length > 0) {
            const hasCompletedClasses = category.classes.some((course: any) => 
                course.status === "completed" || course.status === "in progress"
            );
            if (hasCompletedClasses) return true;
        }
        
        // Recursively check subcategories
        if (category.categories && category.categories.length > 0) {
            return category.categories.some((subcat: any) => hasCompletion(subcat));
        }
        
        return false;
    };

    // Helper function to filter categories based on OR/AND logic
    const filterCategories = (categories: any[]): any[] => {
        return categories.filter(category => {
            const categoryName = category.name?.toUpperCase() || '';
            const isOR = categoryName === 'OR';
            const isAND = categoryName === 'AND';
            
            // If it's an AND with no completion, don't show it
            if (isAND && !hasCompletion(category)) {
                return false;
            }
            
            // If it's an OR, filter its children
            if (isOR && category.categories && category.categories.length > 0) {
                // Filter children to only show ANDs with completion
                const childrenWithCompletion = category.categories.filter((child: any) => {
                    return hasCompletion(child);
                });
                
                // If OR has no children with completion, don't show it
                if (childrenWithCompletion.length === 0) {
                    return false;
                }
            }
            
            return true;
        });
    };

    const renderCategoryContent = (category: any, reqIdx: number, nextParentPath: string, isOR: boolean, subCategoriesToRender: any[]): React.ReactNode => (
        <>
            {category.classes && category.classes.length > 0 ? (
                <CoursesCarousel courses={category.classes} type="completed" />
            ) : subCategoriesToRender.length > 0 ? null : (
                !category.suggested?.length && (
                    <div className="text-sm text-gray-500">No courses in this category</div>
                )
            )}
    
            {category.suggested && category.suggested.length > 0 && (
                <>
                    <div className="mt-2 mb-1 border-t border-gray-100 pt-1">
                        <span className="text-xs text-gray-500 font-medium">Suggested Courses</span>
                    </div>
                    <CoursesCarousel
                        courses={category.suggested}
                        type="suggested"
                        placedSuggestedCourses={placedSuggestedCourses}
                        categoryName={category.name}
                        allSuggestedCourses={allSuggestedCourses}
                        allCompletedCourseCodes={allCompletedCourseCodes}
                        allPlannedCoursesWithOrder={allPlannedCoursesWithOrder}
                    />
                </>
            )}
    
            {subCategoriesToRender.length > 0 &&
                renderCategories(subCategoriesToRender, reqIdx, nextParentPath, isOR)}
        </>
    );
    
    const renderCategories = (categories: any[], reqIdx: number, parentPath: string = "0", parentIsOR: boolean = false): React.ReactNode[] => {
        const filteredCategories = filterCategories(categories);
    
        return filteredCategories.map((category, catIdx) => {
            const originalIdx = categories.indexOf(category);
            const currentCatIdx = `${reqIdx}-${parentPath}-${originalIdx}`;
            const nextParentPath = `${parentPath}-${originalIdx}`;
            const categoryName = category.name?.toUpperCase() || '';
            const isOR = categoryName === 'OR';
            const isAND = categoryName === 'AND';
    
            let displayName = category.name;
            if (isOR) {
                displayName = "Track Options";
            } else if (isAND && parentIsOR) {
                displayName = `Track ${catIdx + 1}`;
            }
    
            let subCategoriesToRender = category.categories || [];
            if (isOR && subCategoriesToRender.length > 0) {
                subCategoriesToRender = subCategoriesToRender.filter((child: any) => hasCompletion(child));
            }
    
            const content = renderCategoryContent(category, reqIdx, nextParentPath, isOR, subCategoriesToRender);
    
            const parts = displayName?.split('|').map((p: string) => p.trim()) || [displayName];
    
            if (parts.length > 1) {
                
                // Build from inside out — innermost part gets the content
                return parts.reduceRight((inner: React.ReactNode, part: string, i: number) => {
                    const partKey = `${currentCatIdx}-part-${i}`;
                    return (
                        <RequirementCategory
                            categoryKey={currentCatIdx}
                            focusLabel={focusLabel}
                            key={partKey}
                            title={part}
                            // these sections are often misleading when done with '|' and to prevent confusion...this is removed
                            completed={i === 0 ? category.progress : 0}
                            total={i === 0 ? category.total : 0}
                            isExpanded={expandedSubcategories[partKey] ?? false}
                            onToggle={() => handleToggleSubcategory(partKey)}
                            hasSubcategories={i < parts.length - 1 || subCategoriesToRender.length > 0}
                        >
                            {inner}
                        </RequirementCategory>
                    );
                }, content);
            }
    
            return (
                <RequirementCategory
                    key={currentCatIdx}
                    categoryKey={currentCatIdx}
                    focusLabel={focusLabel}
                    title={displayName}
                    completed={category.progress}
                    total={category.total}
                    isExpanded={expandedSubcategories[currentCatIdx]}
                    onToggle={() => handleToggleSubcategory(currentCatIdx)}
                    hasSubcategories={subCategoriesToRender.length > 0}
                >
                    {content}
                </RequirementCategory>
            );
        });
    };

    return (
        <>
            <div data-tour="sidebar" className={`${isExpanded ? "w-80 rounded-lg" : "w-20 rounded-md"} bg-bglight rounded-lg border border-border transition-all duration-300 flex flex-col h-full overflow-hidden`}>
                <div 
                    ref={drop}
                    className={`flex-1 overflow-y-auto ${isOver ? 'bg-gray-100' : ''}`}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {isExpanded ? (
                        <div className="p-6 pt-8">
                            <div className="flex items-center justify-between mb-6">
                                <button data-tour="edit-plans" aria-label="Edit Degree Plans" className="flex transition-all duration-100 items-center space-x-2 py-2 px-8 rounded-3xl bg-accent text-textdark text-base hover:text-gray-700" onClick={onRestartOnboarding}>
                                    <NotebookPen size={20} strokeWidth={2} />
                                    <span>Edit plans</span>
                                </button>
                                <button
                                    data-tour="sidebar-toggle"
                                    aria-label="Planner Sidebar Toggle"
                                    className="p-2 hover:bg-gray-200 rounded"
                                    onClick={handleToggleSidebar}
                                >
                                    <ArrowLeftToLine className="w-5 h-5 text-gray-500" />
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
                                        isFirstCategory={reqIdx === 0}
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
                        <div 
                            className="flex flex-col items-center gap-8 pt-8 h-full cursor-pointer hover:bg-[#F5F7F5]" 
                            onClick={handleToggleSidebar}
                            role="button"
                            tabIndex={0}
                            aria-label="Expand sidebar"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleToggleSidebar();
                              }
                            }}
                        >    
                            <button
                                aria-label="Expand sidebar"
                                className="p-2 hover:bg-gray-200 rounded"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleSidebar();
                                }}
                            >
                                <ArrowRightToLine size={24} className="w-5 h-5 text-gray-500" />
                            </button>
                            <button 
                                className="transition-all p-2 rounded-sm text-textdark border border-border bg-bglight hover:bg-border w-12 h-12 flex items-center justify-center"
                                aria-label="Edit Degree Plans"
                                onClick={onRestartOnboarding}
                            >
                                <NotebookPen className="w-5 h-5" strokeWidth={2} />
                            </button>

                            <div className="flex flex-grow" />

                            <div className="w-12 h-12 flex items-center justify-center -translate-y-4">
                                <PanelLeftDashed size={24} className="stroke-[#bbbbbb] group-hover/sidebar:stroke-[#dddddd] transition-colors duration-150" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Sidebar;
