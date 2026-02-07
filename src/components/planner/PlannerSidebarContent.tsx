import React from "react";
import { NotebookPen } from "lucide-react";
import RequirementCategory from "@/components/RequirementCategory";
import CoursesCarousel from "@/components/ui/CoursesCarousel";

interface PlannerSidebarContentProps {
  onClose: () => void;
  requirements: any[];
  expandedCategories: Record<number, boolean>;
  onToggleCategory: (index: number) => void;
  transcriptData: any;
  onDropCourse?: (courseId: string, sourceYear: string, sourceSemesterIndex: number) => void;
  placedSuggestedCourses?: Set<string>;
  onRestartOnboarding?: () => void;
  availableSemesters?: Array<{yearKey: string, semesterIndex: number, title: string}>;
  onAddCourse?: (targetYear: string, targetSemesterIndex: number, course: any, sourceYear: string, sourceSemesterIndex: number, courseId?: string, isSuggested?: boolean) => void;
}

const PlannerSidebarContent: React.FC<PlannerSidebarContentProps> = ({
  onClose,
  requirements,
  placedSuggestedCourses = new Set(),
  onRestartOnboarding,
  availableSemesters = [],
  onAddCourse
}) => {
  const [autoExpandedCategories, setAutoExpandedCategories] = React.useState<{ [key: number]: boolean }>({});
  const [expandedSubcategories, setExpandedSubcategories] = React.useState<Record<string, boolean>>({});

  // Collect all suggested courses from all categories
  const allSuggestedCourses = React.useMemo(() => {
    const courses: any[] = [];
    
    const collectSuggestedCourses = (categories: any[]) => {
      if (!categories) return;
      
      categories.forEach((category) => {
        if (category.suggested && category.suggested.length > 0) {
          courses.push(...category.suggested);
        }
        if (category.categories && category.categories.length > 0) {
          collectSuggestedCourses(category.categories);
        }
      });
    };
    
    requirements.forEach((req) => {
      if (req.categories) {
        collectSuggestedCourses(req.categories);
      }
    });
    
    return courses;
  }, [requirements]);

  React.useEffect(() => {
    const initialExpandedState: { [key: number]: boolean } = {};
    requirements.forEach((req, reqIdx) => {
      const isIncomplete = req.progress < req.total;
      const hasSuggestedCourses = req.categories?.some(
        (category: any) => category.suggested && category.suggested.length > 0
      );
      const hasContent = req.categories && req.categories.length > 0;
      initialExpandedState[reqIdx] = (isIncomplete && hasContent) || hasSuggestedCourses;
    });
    setAutoExpandedCategories(initialExpandedState);
  }, [requirements]);

  React.useEffect(() => {
    const initialState: Record<string, boolean> = {};
    
    const initializeCategories = (categories: any[], reqIdx: number, parentIdx: string = "0") => {
      categories.forEach((category, catIdx) => {
        const key = `${reqIdx}-${parentIdx}-${catIdx}`;
        initialState[key] = category.progress < category.total;
        
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
      
      return (
        <RequirementCategory
          key={currentCatIdx}
          title={displayName}
          completed={category.progress}
          total={category.total}
          isExpanded={expandedSubcategories[currentCatIdx]}
          onToggle={() => handleToggleSubcategory(currentCatIdx)}
          hasSubcategories={subCategoriesToRender.length > 0}
        >
          {category.classes && category.classes.length > 0 ? (
            <CoursesCarousel 
              courses={category.classes} 
              type="completed"
            />
          ) : subCategoriesToRender.length > 0 ? null : (
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
              <CoursesCarousel
                courses={category.suggested}
                type="suggested"
                placedSuggestedCourses={placedSuggestedCourses}
                categoryName={category.name}
                availableSemesters={availableSemesters}
                onAddCourse={onAddCourse}
                allSuggestedCourses={allSuggestedCourses}
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
  );
};

export default PlannerSidebarContent;