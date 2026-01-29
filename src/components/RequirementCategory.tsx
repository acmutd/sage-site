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
  }
  
  const RequirementCategory: React.FC<RequirementCategoryProps> = ({
    title,
    completed,
    total,
    isExpanded,
    onToggle,
    hasSubcategories,
    children,
  }) => {
    return (
      <div className="border border-gray-200 rounded-md overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full flex items-start justify-between p-3 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
            )}
            <span className="text-sm font-medium text-gray-800">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 leading-snug">
              {completed}/{total}
            </span>
            <div className="w-4 h-5 bg-gray-200 rounded overflow-hidden flex flex-col-reverse">
              <div 
                className="w-full bg-green-500 rounded transition-all duration-300"
                style={{ height: `${(completed / total) * 100}%` }}
              />
            </div>
          </div>
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