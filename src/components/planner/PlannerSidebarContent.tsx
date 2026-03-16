import React, { useRef } from "react";
import { NotebookPen } from "lucide-react";
import RequirementCategory from "@/components/planner/RequirementCategory";
import CoursesCarousel from "@/components/planner/CoursesCarousel";
import { getCreditsBreakdownRecursive, getCompletionForCategory } from "@/utils/plannerCredits";
import type { SemestersForCredits } from "@/utils/plannerCredits";

interface PlannerSidebarContentProps {
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
  availableSemesters?: Array<{yearKey: string, semesterIndex: number, title: string}>;
  onAddCourse?: (targetYear: string, targetSemesterIndex: number, course: any, sourceYear: string, sourceSemesterIndex: number, courseId?: string, isSuggested?: boolean) => void;
  focusLabel?: string;
  semesters?: SemestersForCredits;
  coursebookData?: Record<string, any[]>;
  gradesData?: Record<string, any>
}

const PlannerSidebarContent: React.FC<PlannerSidebarContentProps> = ({
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
}) => {
  const [autoExpandedCategories, setAutoExpandedCategories] = React.useState<{ [key: number]: boolean }>({});
  const [expandedSubcategories, setExpandedSubcategories] = React.useState<Record<string, boolean>>({});
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

  React.useEffect(() => {
    if (!focusLabel) return;
    setTimeout(() => {
        document.querySelector('.highlight-pulse')
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [focusLabel]);

  React.useEffect(() => {
    const getSuggestedCodes = (c: any): Set<string> =>
      new Set((c?.suggested || []).map((s: any) => String(s.code || s.course_code || "").trim().toUpperCase()).filter((x: string) => !!x));

    const buildSuggestedByKey = (categories: any[], reqIdx: number, parentIdx: string): Record<string, Set<string>> => {
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
      if (!prevCodes) return;
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

    // On initial load: expand every section that has suggested courses, plus ancestors
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
        const defaultExpanded = prevHadAny
          ? category.progress < category.total
          : keysWithSuggestedOnInitial.has(key) || category.progress < category.total;
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

  const handleToggleSubcategory = (key: string) => {
    setExpandedSubcategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const hasCompletion = (category: any): boolean => {
    if (category.progress > 0) return true;
    
    if (category.classes && category.classes.length > 0) {
      const hasCompletedClasses = category.classes.some((course: any) => 
        course.status === "completed" || course.status === "in progress"
      );
      if (hasCompletedClasses) return true;
    }
    
    if (category.categories && category.categories.length > 0) {
      return category.categories.some((subcat: any) => hasCompletion(subcat));
    }
    
    return false;
  };

  const filterCategories = (categories: any[]): any[] => {
    return categories.filter(category => {
      const categoryName = category.name?.toUpperCase() || '';
      const isOR = categoryName === 'OR';
      const isAND = categoryName === 'AND';
      
      if (isAND && !hasCompletion(category)) {
        return false;
      }
      
      if (isOR && category.categories && category.categories.length > 0) {
        const childrenWithCompletion = category.categories.filter((child: any) => {
          return hasCompletion(child);
        });
        
        if (childrenWithCompletion.length === 0) {
          return false;
        }
      }
      
      return true;
    });
  };

  const renderCategories = (categories: any[], reqIdx: number, parentPath: string = "0", parentIsOR: boolean = false) => {
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
        subCategoriesToRender = subCategoriesToRender.filter((child: any) =>
          hasCompletion(child)
        );
      }

      const completion = semesters ? getCompletionForCategory(category, semesters) : { completed: category.progress, total: category.total, isCreditBased: true };
      const creditsBreakdown = completion.isCreditBased && semesters ? getCreditsBreakdownRecursive(category, semesters) : undefined;

      return (
        <RequirementCategory
          categoryKey={currentCatIdx}
          focusLabel={focusLabel}
          key={currentCatIdx}
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
          {category.classes && category.classes.length > 0 ? (
              <CoursesCarousel
                  courses={category.classes} 
                  type="completed"
              />
          ) : subCategoriesToRender.length > 0 ? null : (
              !category.suggested?.length && (
                  <div className="text-sm text-gray-500">
                      No courses in this category
                  </div>
              )
          )}

          {category.suggested && category.suggested.length > 0 && (
            <>
              <div className="mt-2 mb-1 border-t border-gray-100 pt-1">
                <span className="text-xs text-gray-500 font-medium">
                  Suggested Courses
                </span>
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
                gradesData={gradesData}
              />
            </>
          )}

          {subCategoriesToRender.length > 0 &&
            renderCategories(subCategoriesToRender, reqIdx, nextParentPath, isOR)}
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

      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Degree Requirements
      </h2>

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
            onToggle={() => {
              setAutoExpandedCategories((prev) => ({
                ...prev,
                [reqIdx]: !prev[reqIdx],
              }));
            }}
            hasSubcategories={req.categories && req.categories.length > 0}
            creditsBreakdown={reqCreditsBreakdown}
            footnote={(req as any).footnote}  // ← add
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
  );
};

export default PlannerSidebarContent;