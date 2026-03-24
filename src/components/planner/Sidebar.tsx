import React, { useState, useEffect, useRef } from "react";
import { NotebookPen, ArrowLeftToLine, PanelLeftDashed, ArrowRightToLine, Compass, ChevronRight } from "lucide-react";
import { useDrop } from "react-dnd";
import RequirementCategory from '@/components/planner/RequirementCategory';
import CoursesCarousel from '@/components/planner/CoursesCarousel';
import { getCreditsBreakdownRecursive, getCompletionForCategory } from "@/utils/plannerCredits";
import type { SemestersForCredits } from "@/utils/plannerCredits";
import { CartItem } from "./CourseDiscoveryModal";

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
    semesters?: SemestersForCredits;
    coursebookData?: Record<string, any[]>;
    gradesData?: Record<string, any>;
    coursebookSemester?: string | null;
    onOpenDiscovery?: () => void;
    discoveryCart?: CartItem[];
}

const Sidebar: React.FC<SidebarProps> = ({
    requirements,
    onDropCourse,
    semesters,
    isExpanded: externalIsExpanded,
    onToggleExpanded,
    placedSuggestedCourses = new Set(),
    allCompletedCourseCodes = [],
    allPlannedCoursesWithOrder = [],
    onRestartOnboarding,
    focusLabel,
    coursebookData = {},
    gradesData = {},
    coursebookSemester,
    onOpenDiscovery,
    discoveryCart = [],
}) => {
    const [internalIsExpanded, setInternalIsExpanded] = useState(true);
    const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;
    const [expandedSubcategories, setExpandedSubcategories] = useState<Record<string, boolean>>({});
    const [autoExpandedCategories, setAutoExpandedCategories] = useState<{ [key: number]: boolean }>({});
    const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
    const prevSuggestedByKeyRef = useRef<Record<string, Set<string>>>({});

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

    // parent category - only expand reqs that have categories with new suggestions

    useEffect(() => {
        const getSuggestedCodes = (c: any): Set<string> =>
            new Set((c?.suggested || []).map((s: any) => String(s.code || s.course_code || "").trim().toUpperCase()).filter((x: string) => !!x));

        const buildSuggestedByKey = (
            categories: any[],
            reqIdx: number,
            parentIdx: string
        ): Record<string, Set<string>> => {
            const out: Record<string, Set<string>> = {};
            categories.forEach((category, catIdx) => {
                const key = `${reqIdx}-${parentIdx}-${catIdx}`;
                out[key] = getSuggestedCodes(category);
                if (category.categories?.length) {
                    Object.assign(out, buildSuggestedByKey(category.categories, reqIdx, `${parentIdx}-${catIdx}`));
                }
            });
            return out;
        };

        const newSuggestedByKey: Record<string, Set<string>> = {};
        requirements.forEach((req, reqIdx) => {
            if (req.categories?.length) {
                Object.assign(newSuggestedByKey, buildSuggestedByKey(req.categories, reqIdx, "0"));
            }
        });

        const keysWithNewSuggestions = new Set<string>();
        Object.entries(newSuggestedByKey).forEach(([key, newCodes]) => {
            const prevCodes = prevSuggestedByKeyRef.current[key];
            if (!prevCodes) return; // new category, will use initial expansion below
            if (newCodes.size > prevCodes.size) keysWithNewSuggestions.add(key);
        });
        const withAncestors = new Set(keysWithNewSuggestions);
        keysWithNewSuggestions.forEach((key) => {
            let k = key;
            while (true) {
                const lastDash = k.lastIndexOf("-");
                if (lastDash <= 0) break;
                k = k.slice(0, lastDash);
                withAncestors.add(k);
            }
        });
        const keysToExpand = withAncestors;

        const prevHadAny = Object.keys(prevSuggestedByKeyRef.current).length > 0;
        prevSuggestedByKeyRef.current = newSuggestedByKey;

        // On initial load: expand every section that has suggested courses (or contains one), plus ancestors
        const keysWithSuggestedOnInitial = new Set<string>();
        if (!prevHadAny) {
            Object.entries(newSuggestedByKey).forEach(([key, codes]) => {
                if (codes.size > 0) keysWithSuggestedOnInitial.add(key);
            });
            keysWithSuggestedOnInitial.forEach((key) => {
                let k = key;
                while (true) {
                    const lastDash = k.lastIndexOf("-");
                    if (lastDash <= 0) break;
                    k = k.slice(0, lastDash);
                    keysWithSuggestedOnInitial.add(k);
                }
            });
        }

        const initializeCategories = (categories: any[], reqIdx: number, parentIdx: string) => {
            const result: Record<string, boolean> = {};
            categories.forEach((category, catIdx) => {
                const key = `${reqIdx}-${parentIdx}-${catIdx}`;
                const isIncomplete = category.progress < category.total && category.total > 0;
                const defaultExpanded = prevHadAny
                    ? isIncomplete
                    : keysWithSuggestedOnInitial.has(key) || isIncomplete;
                const gotNewSuggestions = keysToExpand.has(key);
                let expanded: boolean;
                if (prevHadAny && expandedSubcategories[key] === false && !gotNewSuggestions) {
                    expanded = false;
                } else if (gotNewSuggestions) {
                    expanded = true;
                } else if (prevHadAny && key in expandedSubcategories) {
                    expanded = expandedSubcategories[key];
                } else {
                    expanded = defaultExpanded;
                }
                result[key] = expanded;
                const parts = (category.name || '').split('|').map((p: string) => p.trim());
                if (parts.length > 1) {
                    parts.forEach((_: string, i: number) => {
                        const partKey = `${key}-part-${i}`;
                        if (gotNewSuggestions) {
                            result[partKey] = true;
                        } else if (!(partKey in expandedSubcategories)) {
                            result[partKey] = defaultExpanded;
                        } else {
                            result[partKey] = expandedSubcategories[partKey];
                        }
                    });
                }
                if (category.categories?.length) {
                    Object.assign(result, initializeCategories(category.categories, reqIdx, `${parentIdx}-${catIdx}`));
                }
            });
            return result;
        };

        const initialState: Record<string, boolean> = {};
        requirements.forEach((req, reqIdx) => {
            if (req.categories?.length) {
                Object.assign(initialState, initializeCategories(req.categories, reqIdx, "0"));
            }
        });

        setExpandedSubcategories(initialState);

        const reqKeysWithNew = new Set<number>();
        keysToExpand.forEach((k) => {
            const reqIdx = parseInt(k.split("-")[0], 10);
            if (!isNaN(reqIdx)) reqKeysWithNew.add(reqIdx);
        });

        if (!prevHadAny) {
            const initialReqState: { [key: number]: boolean } = {};
            requirements.forEach((req, reqIdx) => {
                const isIncomplete = req.progress < req.total;
                const hasSuggested = req.categories?.some((c: any) => c.suggested?.length);
                const hasContent = !!(req.categories?.length);
                initialReqState[reqIdx] = (isIncomplete && hasContent) || !!hasSuggested;
            });
            setAutoExpandedCategories(initialReqState);
        } else if (reqKeysWithNew.size > 0) {
            setAutoExpandedCategories((prev) => {
                const next = { ...prev };
                reqKeysWithNew.forEach((idx) => { next[idx] = true; });
                return next;
            });
        }
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

        if (category.suggested && category.suggested.length > 0) return true;
        if (category.prereq_blocked && category.prereq_blocked.length > 0) return true;
        
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
                        coursebookData={coursebookData}
                        coursebookSemester={coursebookSemester}
                        gradesData={gradesData}
                    />
                </>
            )}

            {category.prereq_blocked && category.prereq_blocked.length > 0 && (
                <>
                    <div className="mt-2 mb-1 border-t border-gray-100 pt-1">
                        <span className="text-xs text-gray-500 font-medium">Needs Prerequisites</span>
                    </div>
                    <CoursesCarousel
                        courses={category.prereq_blocked}
                        type="prereq_blocked"
                        categoryName={category.name}
                        allSuggestedCourses={allSuggestedCourses}
                        allCompletedCourseCodes={allCompletedCourseCodes}
                        allPlannedCoursesWithOrder={allPlannedCoursesWithOrder}
                        coursebookData={coursebookData}
                        coursebookSemester={coursebookSemester}
                        gradesData={gradesData}
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

            const completion = semesters ? getCompletionForCategory(category, semesters) : { completed: category.progress, total: category.total, isCreditBased: true };
            const creditsBreakdown = completion.isCreditBased && semesters ? getCreditsBreakdownRecursive(category, semesters) : undefined;

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
                            completed={i === 0 ? completion.completed : 0}
                            total={i === 0 ? completion.total : 0}
                            isExpanded={expandedSubcategories[partKey] ?? false}
                            onToggle={() => handleToggleSubcategory(partKey)}
                            hasSubcategories={i < parts.length - 1 || subCategoriesToRender.length > 0}
                            creditsBreakdown={i === 0 ? creditsBreakdown : undefined}
                            footnote={i === 0 ? category.footnote : undefined}
                            rules={i === 0 ? category.rules : undefined}
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
                    completed={completion.completed}
                    total={completion.total}
                    isExpanded={expandedSubcategories[currentCatIdx]}
                    onToggle={() => handleToggleSubcategory(currentCatIdx)}
                    hasSubcategories={subCategoriesToRender.length > 0}
                    creditsBreakdown={creditsBreakdown}
                    footnote={category.footnote}
                    rules={category.rules}
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
                                <button data-tour="edit-plans" aria-label="Edit Degree Plans" className="flex transition-all duration-100 items-center space-x-2 py-2 px-8 rounded-3xl bg-accent text-textdark text-base hover:text-gray-700" onClick={() => {
                                    if (document.querySelector('.driver-active-element')) return;
                                    onRestartOnboarding?.();
                                }}>
                                    <NotebookPen size={20} strokeWidth={2} />
                                    <span>Edit plans</span>
                                </button>
                                <button
                                    data-tour="sidebar-toggle"
                                    aria-label="Planner Sidebar Toggle"
                                    className="p-2 hover:bg-gray-200 rounded"
                                    onClick={() => {
                                        if (document.querySelector('.driver-active-element')) return;
                                        handleToggleSidebar();
                                    }}
                                >
                                    <ArrowLeftToLine className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <button
                                onClick={onOpenDiscovery}
                                className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-dashed
        border-green-300 bg-green-50 hover:bg-green-100 transition-colors text-left mb-4 group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                                    <Compass className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-green-800">
                                        {discoveryCart.length > 0 ? 'Shop more courses' : 'Discover Courses'}
                                    </div>
                                    <div className="text-xs text-green-600">Browse &amp; add to your plan</div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-green-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                            </button>

                            {discoveryCart.length > 0 && (
                                <div className="mb-4 space-y-1.5">
                                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">
                                        In cart · {discoveryCart.length} course{discoveryCart.length !== 1 ? 's' : ''}
                                    </div>
                                    {discoveryCart.map(item => (
                                        <div
                                            key={item.course.course_id}
                                            onClick={onOpenDiscovery}
                                            className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-white border border-green-200
                    hover:border-green-300 hover:bg-green-50 transition-colors cursor-pointer group"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold text-gray-700 truncate">{item.course.course_code}</div>
                                                <div className="text-[10px] text-gray-400 truncate">{item.course.course_name}</div>
                                            </div>
                                            <span className="text-[10px] text-gray-400 flex-shrink-0">{item.course.credits}cr</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <h2 className="text-xl font-bold text-gray-900 mb-4">
                                Degree Requirements
                            </h2>

                            <div className="space-y-3 pb-24">
                                {requirements.map((req, reqIdx) => {
                                    const reqCompletion = semesters ? getCompletionForCategory(req, semesters) : { completed: req.progress, total: req.total, isCreditBased: true };
                                    const reqCreditsBreakdown = reqCompletion.isCreditBased && semesters ? getCreditsBreakdownRecursive(req, semesters) : undefined;
                                    return (
                                        <RequirementCategory
                                            key={reqIdx}
                                            title={req.degree}
                                            completed={reqCompletion.completed}
                                            total={reqCompletion.total}
                                            isExpanded={autoExpandedCategories[reqIdx]}
                                            onToggle={() => {
                                                setAutoExpandedCategories((prev) => ({
                                                    ...prev,
                                                    [reqIdx]: !prev[reqIdx],
                                                }));
                                            }}
                                            hasSubcategories={req.categories && req.categories.length > 0}
                                            isFirstCategory={reqIdx === 0}
                                            creditsBreakdown={reqCreditsBreakdown}
                                            footnote={(req as any).footnote}
                                            rules={(req as any).rules}
                                        >
                                            {req.categories && req.categories.length > 0 ? (
                                                renderCategories(req.categories, reqIdx)
                                            ) : (
                                                <div className="text-sm text-gray-500">
                                                    No categories available
                                                </div>
                                            )}
                                        </RequirementCategory>
                                    );
                                })}
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
                                data-tour="sidebar-toggle"
                                aria-label="Expand sidebar"
                                className="p-2 hover:bg-gray-200 rounded"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (document.querySelector('.driver-active-element')) return;
                                    handleToggleSidebar();
                                }}
                            >
                                <ArrowRightToLine size={24} className="w-5 h-5 text-gray-500" />
                            </button>
                            <button
                                data-tour="edit-plans"
                                className="transition-all p-2 rounded-sm text-textdark border border-border bg-bglight hover:bg-border w-12 h-12 flex items-center justify-center"
                                aria-label="Edit Degree Plans"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (document.querySelector('.driver-active-element')) return;
                                    onRestartOnboarding?.();
                                }}
                            >
                                <NotebookPen className="w-5 h-5" strokeWidth={2} />
                            </button>

                            <button
                                data-tour="course-discovery"
                                className="transition-all p-2 rounded-sm text-textdark border border-border bg-bglight hover:bg-border w-12 h-12 flex items-center justify-center"
                                aria-label="Discover Courses"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (document.querySelector('.driver-active-element')) return;
                                    onOpenDiscovery?.();
                                }}
                            >
                                <Compass className="w-5 h-5" strokeWidth={2} />
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
