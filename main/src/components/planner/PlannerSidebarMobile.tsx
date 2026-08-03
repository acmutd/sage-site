import React from "react";
import { NotebookPen } from "lucide-react";
import RequirementCategory from "@/components/planner/RequirementCategory";
import CoursesCarousel from "@/components/planner/CoursesCarousel";
import PlannerDiscoveryBanner from "@/components/planner/PlannerDiscoveryBanner";
import { getCreditsBreakdownRecursive, getCompletionForCategory } from "@/utils/plannerCredits";
import type { SemestersForCredits } from "@/utils/plannerCredits";
import { filterCategories, hasCompletion } from "@/utils/plannerSidebarUtils";
import { usePlannerSidebarCategories } from "@/hooks/usePlannerSidebarCategories";
import { usePlannerStore } from "@/stores/plannerStore";

interface PlannerSidebarMobileProps {
  onClose: () => void;
  requirements: any[];
  expandedCategories: Record<number, boolean>;
  onToggleCategory: (index: number) => void;
  transcriptData: any;
  onDropCourse?: (courseId: string, sourceYear: string, sourceSemesterIndex: number) => void;
  placedSuggestedCourses?: Set<string>;
  allCompletedCourseCodes?: string[];
  allPlannedCoursesWithOrder?: Array<{
    code: string;
    yearKey: string;
    semesterIndex: number;
    semesterOrder: number;
  }>;
  onRestartOnboarding?: () => void;
  availableSemesters?: Array<{ yearKey: string; semesterIndex: number; title: string }>;
  onAddCourse?: (targetYear: string, targetSemesterIndex: number, course: any, sourceYear: string, sourceSemesterIndex: number, courseId?: string, isSuggested?: boolean) => void;
  focusLabel?: string;
  semesters?: SemestersForCredits;
  coursebookData?: Record<string, any[]>;
  gradesData?: Record<string, any>;
  coursebookSemester?: string | null;
  onOpenDiscovery?: () => void;
}

const PlannerSidebarMobile: React.FC<PlannerSidebarMobileProps> = ({
  onClose,
  requirements,
  placedSuggestedCourses = new Set(),
  allCompletedCourseCodes = [],
  allPlannedCoursesWithOrder = [],
  onRestartOnboarding,
  availableSemesters = [],
  onAddCourse,
  focusLabel,
  semesters,
  coursebookData,
  gradesData,
  coursebookSemester,
  onOpenDiscovery,
}) => {
  const {
    autoExpandedCategories,
    setAutoExpandedCategories,
    expandedSubcategories,
    handleToggleSubcategory,
    allSuggestedCourses,
  } = usePlannerSidebarCategories({ requirements, focusLabel });

  const stagedCourses = usePlannerStore((s) => s.stagedCourses);
  const removeStagedCourse = usePlannerStore((s) => s.removeStagedCourse);

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
              placedSuggestedCourses={placedSuggestedCourses}
              categoryName={category.name}
              availableSemesters={availableSemesters}
              onAddCourse={onAddCourse}
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

  return (
    <div className="h-full overflow-y-auto p-4" style={{ scrollbarWidth: 'none' }}>
      <div className="mb-6">
        <button
          className="w-full flex items-center justify-center space-x-2 py-2 px-6 rounded-3xl bg-accent text-textdark hover:bg-buttonhover transition-all duration-100"
          onClick={() => {
            onRestartOnboarding?.();
            onClose();
          }}
        >
          <NotebookPen size={20} strokeWidth={2} />
          <span>Edit plans</span>
        </button>
      </div>

      <PlannerDiscoveryBanner onOpenDiscovery={onOpenDiscovery} />

      {stagedCourses.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="text-[10px] font-semibold text-purple-500 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
              Staged · {stagedCourses.length} course{stagedCourses.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={() => usePlannerStore.getState().clearStagedCourses()}
              className="text-[10px] text-gray-400 hover:text-red-400 transition-colors"
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

      <h2 className="text-xl font-bold text-gray-900 mb-4">Degree Requirements</h2>

      <div className="space-y-3 pb-6">
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
  );
};

export default PlannerSidebarMobile;
