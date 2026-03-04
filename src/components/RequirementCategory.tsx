import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";


// RequirementCategory Component
interface RequirementCategoryProps {
    title: string;
    completed: number;
    total: number;
    isExpanded: boolean;
    onToggle: () => void;
    hasSubcategories: boolean;
    children: React.ReactNode;
    isFirstCategory?: boolean;
    categoryKey?: string;
  }
  
  const RequirementCategory: React.FC<RequirementCategoryProps> = ({
    title,
    completed,
    total,
    isExpanded,
    onToggle,
    hasSubcategories,
    children,
    isFirstCategory = false,
    categoryKey,
  }) => {
    return (
      <div className="border border-gray-200 rounded-md overflow-hidden" data-category-key={categoryKey}>
        <button
          onClick={onToggle}
          className="w-full flex items-start justify-between gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
        >
          <div data-tour={isFirstCategory ? "requirement-category-toggle" : undefined} className="flex items-center gap-2 min-w-0">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
            )}
            <span className="text-sm font-medium text-gray-800">{title}</span>
          </div>
          {total > 0 && (
            <div data-tour={isFirstCategory ? "requirement-category-progress" : undefined} className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-medium text-gray-600 tabular-nums">
                {completed}/{total}
              </span>
              <div className="w-4 h-5 bg-gray-200 rounded overflow-hidden flex flex-col-reverse">
                <div 
                  className="w-full bg-green-500 rounded transition-all duration-300"
                  style={{ height: `${(completed / total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </button>
  
        {isExpanded && (
          <div className={`${hasSubcategories ? "p-3" : "p-3 pt-0"} space-y-2`}>
            {children}
          </div>
        )}
      </div>
    );
  };

export default RequirementCategory;