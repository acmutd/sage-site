import React, { useRef, useEffect } from "react";
import { NotebookPen, Compass } from "lucide-react";
import { useDrop } from "react-dnd";
import RequirementCategory from '@/components/planner/RequirementCategory';
import CoursesCarousel from '@/components/planner/CoursesCarousel';
import PlannerDiscoveryBanner from '@/components/planner/PlannerDiscoveryBanner';
import { getCreditsBreakdownRecursive, getCompletionForCategory } from "@/utils/plannerCredits";
import type { SemestersForCredits } from "@/utils/plannerCredits";
import { filterCategories, hasCompletion, formatCoursebookSemester } from "@/utils/plannerSidebarUtils";
import { usePlannerSidebarCategories } from "@/hooks/usePlannerSidebarCategories";
import { CartItem } from "./CourseDiscoveryModal";
import { usePlannerStore } from '@/stores/plannerStore';
import { useUIStore } from '@/stores/uiStore';
import { SidebarTemplate } from "@sage/ui";

interface PlannerSidebarDesktopProps {
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

const PlannerSidebarDesktop: React.FC<PlannerSidebarDesktopProps> = ({
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
}) => {
    const [internalIsExpanded, setInternalIsExpanded] = React.useState(true);
    const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

    const { plannerSidebarWidth, setPlannerSidebarWidth } = useUIStore();
    const [isResizing, setIsResizing] = React.useState(false);
    const [showAvailableOnly, setShowAvailableOnly] = React.useState(false);
    const isResizingRef = useRef(false);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const {
        autoExpandedCategories,
        setAutoExpandedCategories,
        expandedSubcategories,
        handleToggleSubcategory,
        allSuggestedCourses,
    } = usePlannerSidebarCategories({ requirements, focusLabel });

    const stagedCourses = usePlannerStore((s) => s.stagedCourses);
    const removeStagedCourse = usePlannerStore((s) => s.removeStagedCourse);

    const [{ isOver }, drop] = useDrop(
        () => ({
            accept: "COURSE",
            drop: (item: any) => {
                if (item.courseId && item.sourceYear !== undefined && item.sourceSemesterIndex !== undefined && onDropCourse) {
                    onDropCourse(item.courseId, item.sourceYear, item.sourceSemesterIndex);
                }
            },
            collect: (monitor) => ({ isOver: monitor.isOver() }),
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

    const handleResizeStart = (e: React.MouseEvent) => {
        if (!isExpanded) return;
        isResizingRef.current = true;
        setIsResizing(true);
        startXRef.current = e.clientX;
        startWidthRef.current = plannerSidebarWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isResizingRef.current) return;
            const newWidth = Math.min(420, Math.max(320, startWidthRef.current + (e.clientX - startXRef.current)));
            setPlannerSidebarWidth(newWidth);
        };
        const onMouseUp = () => {
            if (!isResizingRef.current) return;
            isResizingRef.current = false;
            setIsResizing(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            if (sidebarRef.current) setPlannerSidebarWidth(sidebarRef.current.offsetWidth);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [setPlannerSidebarWidth]);

    const normalizedPlaced = new Set([...placedSuggestedCourses].map((c) => c.toLowerCase().replace(/\s+/g, '')));
    const allStagedPlaced = stagedCourses.every((c) => normalizedPlaced.has(c.course_id.toLowerCase().replace(/\s+/g, '')));

    const renderCategoryContent = (category: any, reqIdx: number, nextParentPath: string, isOR: boolean, subCategoriesToRender: any[]): React.ReactNode => {
        const suggestedCodes = new Set((category.suggested || []).map((c: any) => c.code));
        const filteredPrereqBlocked = (category.prereq_blocked || []).filter((c: any) => !suggestedCodes.has(c.code));

        return (
            <>
                {category.classes?.length > 0 ? (
                    <CoursesCarousel courses={category.classes} type="completed" />
                ) : subCategoriesToRender.length > 0 ? null : (
                    !category.suggested?.length && (
                        category.evaluatable === false ? (
                            <div className="text-sm text-gray-500">Contact your advisor for more info on how to complete this requirement.</div>
                        ) : (
                            <div className="text-sm text-gray-500">No courses in this category</div>
                        )
                    )
                )}

                {category.suggested?.length > 0 && (
                    <>
                        <div className="mt-2 mb-1 border-t border-gray-100 pt-1">
                            <span className="text-xs text-gray-500 font-medium">Suggested Courses</span>
                        </div>
                        <CoursesCarousel
                            courses={category.suggested}
                            type="suggested"
                            showAvailableOnly={showAvailableOnly}
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

                {filteredPrereqBlocked.length > 0 && (
                    <>
                        <div className="mt-2 mb-1 border-t border-gray-100 pt-1">
                            <span className="text-xs text-gray-500 font-medium">Needs Prerequisites</span>
                        </div>
                        <CoursesCarousel
                            courses={filteredPrereqBlocked}
                            type="prereq_blocked"
                            showAvailableOnly={showAvailableOnly}
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

                {subCategoriesToRender.length > 0 && renderCategories(subCategoriesToRender, reqIdx, nextParentPath, isOR)}
            </>
        );
    };

    const renderCategories = (categories: any[], reqIdx: number, parentPath = "0", parentIsOR = false): React.ReactNode[] => {
        const filtered = filterCategories(categories);
        return filtered.map((category, catIdx) => {
            const originalIdx = categories.indexOf(category);
            const currentCatIdx = `${reqIdx}-${parentPath}-${originalIdx}`;
            const nextParentPath = `${parentPath}-${originalIdx}`;
            const categoryName = category.name?.toUpperCase() || '';
            const isOR = categoryName === 'OR';
            const isAND = categoryName === 'AND';

            let displayName = category.name;
            if (isOR) displayName = "Track Options";
            else if (isAND && parentIsOR) displayName = `Track ${catIdx + 1}`;

            let subCategoriesToRender = category.categories || [];
            if (isOR && subCategoriesToRender.length > 0) {
                subCategoriesToRender = subCategoriesToRender.filter((child: any) => hasCompletion(child));
            }

            const content = renderCategoryContent(category, reqIdx, nextParentPath, isOR, subCategoriesToRender);
            const parts = displayName?.split('|').map((p: string) => p.trim()) || [displayName];
            const completion = semesters ? getCompletionForCategory(category, semesters) : { completed: category.progress, total: category.total, isCreditBased: true };
            const creditsBreakdown = completion.isCreditBased && semesters ? getCreditsBreakdownRecursive(category, semesters) : undefined;

            if (parts.length > 1) {
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

    const primaryAction = {
        label: "Edit plans",
        icon: <NotebookPen size={20} strokeWidth={2} />,
        onClick: () => {
            if (document.querySelector('.driver-active-element')) return;
            onRestartOnboarding?.();
        },
        dataTour: "edit-plans",
    };

    const collapsedActions = [
        primaryAction,
        ...(onOpenDiscovery
            ? [{ label: "Discover Courses", icon: <Compass className="w-4 h-4 text-green-500" />, onClick: () => onOpenDiscovery() }]
            : []),
    ];

    return (
        <div
            ref={sidebarRef}
            data-tour="sidebar"
            className={`relative h-full ${isResizing ? "transition-none" : "transition-all duration-300"}`}
            style={isExpanded ? { width: plannerSidebarWidth } : undefined}
        >
            <SidebarTemplate
                isCollapsed={!isExpanded}
                onToggleCollapse={handleToggleSidebar}
                primaryAction={primaryAction}
                collapsedActions={collapsedActions}
                className={`${isExpanded ? "rounded-lg w-full" : "w-20 rounded-md"} h-full`}
                contentClassName="p-6 pt-8"
                renderExpandedContent={
                    <div
                        ref={drop}
                        className={`${isOver ? 'bg-gray-100' : ''}`}
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <PlannerDiscoveryBanner onOpenDiscovery={onOpenDiscovery} />

                        {stagedCourses.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <div className="text-[10px] font-semibold text-purple-500 uppercase tracking-wide flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                                        Staged · {stagedCourses.length} course{stagedCourses.length !== 1 ? 's' : ''}
                                    </div>
                                    <button
                                        onClick={() => !allStagedPlaced && usePlannerStore.getState().clearStagedCourses()}
                                        className={`text-[10px] transition-colors ${allStagedPlaced ? 'text-gray-300 cursor-not-allowed pointer-events-none' : 'text-gray-400 hover:text-red-400 cursor-pointer'}`}
                                    >
                                        Clear all
                                    </button>
                                </div>
                                <CoursesCarousel
                                    courses={stagedCourses}
                                    type="discovered"
                                    onRemove={removeStagedCourse}
                                    coursebookData={coursebookData}
                                    gradesData={gradesData}
                                    coursebookSemester={coursebookSemester}
                                    availableSemesters={[]}
                                    placedSuggestedCourses={placedSuggestedCourses}
                                />
                            </div>
                        )}

                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Degree Requirements</h2>
                            <div className="flex items-center gap-2.5 px-2.5 py-2 bg-white border border-gray-200 rounded-xl">
                                <button
                                    role="switch"
                                    aria-checked={showAvailableOnly}
                                    onClick={() => setShowAvailableOnly(prev => !prev)}
                                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none ${showAvailableOnly ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${showAvailableOnly ? 'left-[18px]' : 'left-0.5'}`} />
                                </button>
                                <label
                                    className="text-xs text-gray-500 cursor-pointer select-none"
                                    onClick={() => setShowAvailableOnly(prev => !prev)}
                                >
                                    {coursebookSemester ? `Show ${formatCoursebookSemester(coursebookSemester)} offerings` : 'Show available sections only'}
                                </label>
                            </div>
                        </div>

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
                                        onToggle={() => setAutoExpandedCategories((prev) => ({ ...prev, [reqIdx]: !prev[reqIdx] }))}
                                        hasSubcategories={req.categories?.length > 0}
                                        isFirstCategory={reqIdx === 0}
                                        creditsBreakdown={reqCreditsBreakdown}
                                        footnote={(req as any).footnote}
                                        rules={(req as any).rules}
                                    >
                                        {req.categories?.length > 0 ? (
                                            renderCategories(req.categories, reqIdx)
                                        ) : (
                                            <div className="text-sm text-gray-500">No categories available</div>
                                        )}
                                    </RequirementCategory>
                                );
                            })}
                        </div>
                    </div>
                }
            />
            {isExpanded && (
                <div
                    role="separator"
                    aria-label="Resize sidebar"
                    aria-orientation="vertical"
                    tabIndex={0}
                    className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-col-resize group/grip z-10 translate-x-1/2"
                    onMouseDown={handleResizeStart}
                    onKeyDown={(e) => {
                        const step = 10;
                        if (e.key === 'ArrowRight') setPlannerSidebarWidth(Math.min(420, plannerSidebarWidth + step));
                        if (e.key === 'ArrowLeft') setPlannerSidebarWidth(Math.max(320, plannerSidebarWidth - step));
                    }}
                >
                    <div className="w-1.5 h-10 rounded-full bg-gray-300 opacity-30 group-hover/grip:opacity-100 transition-opacity duration-150 flex flex-col items-center justify-center gap-[3px]">
                        <span className="w-[3px] h-[3px] rounded-full bg-gray-500" />
                        <span className="w-[3px] h-[3px] rounded-full bg-gray-500" />
                        <span className="w-[3px] h-[3px] rounded-full bg-gray-500" />
                        <span className="w-[3px] h-[3px] rounded-full bg-gray-500" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlannerSidebarDesktop;
