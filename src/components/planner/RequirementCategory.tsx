import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import type { CreditsBreakdown } from "@/utils/plannerCredits";

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
    focusLabel?: string;
    categoryKey?: string;
    /** When provided, displays credits completed + in progress + planned, with hover tooltip */
    creditsBreakdown?: CreditsBreakdown;
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
    focusLabel,
    categoryKey,
    creditsBreakdown,
  }) => {
    const isHighlighted = focusLabel ? title.includes(focusLabel) : false;
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const [canHover, setCanHover] = useState(true);

    useEffect(() => {
      const checkHover = () => {
        const hoverQuery = window.matchMedia("(hover: hover)");
        setCanHover(hoverQuery.matches);
      };
      checkHover();
      const hoverQuery = window.matchMedia("(hover: hover)");
      hoverQuery.addEventListener("change", checkHover);
      return () => hoverQuery.removeEventListener("change", checkHover);
    }, []);

    // Use credits breakdown when available: number = completed + in progress + planned (credit hours)
    const hasBreakdown = creditsBreakdown && total > 0;
    const displayValue = hasBreakdown
      ? creditsBreakdown.completed + creditsBreakdown.inProgress + creditsBreakdown.planned
      : completed;
    const displayTotal = total;
    const progressPercent = displayTotal > 0 ? Math.min((displayValue / displayTotal) * 100, 100) : 0;

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
      if (hasBreakdown && canHover) {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPosition({
          top: rect.top,
          left: rect.right + 10,
        });
        setShowTooltip(true);
      }
    };

    const handleMouseLeave = () => {
      setShowTooltip(false);
    };

    const handleInfoClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!canHover) setShowTooltip((prev) => !prev);
    };

    const tooltipContent = hasBreakdown && (
      <div
        className={
          !canHover
            ? "bg-white text-black rounded-t-2xl p-4 shadow-2xl w-full border-t-2 border-gray-200"
            : "bg-white text-black rounded-md p-3 shadow-lg w-56 md:w-64 border border-gray-200"
        }
      >
        <h3 className={`font-semibold mb-2 ${!canHover ? "text-base" : "text-sm"} text-gray-900`}>
          Credit hours
        </h3>
        <div className={`space-y-1 ${!canHover ? "text-sm" : "text-xs"}`}>
          <div className="flex gap-2">
            <span className="text-gray-600 font-medium">Completed:</span>
            <span className="text-gray-900">{creditsBreakdown!.completed} hrs</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-600 font-medium">In progress:</span>
            <span className="text-gray-900">{creditsBreakdown!.inProgress} hrs</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-600 font-medium">Planned:</span>
            <span className="text-gray-900">{creditsBreakdown!.planned} hrs</span>
          </div>
        </div>
      </div>
    );

    return (
      <div className={`border border-gray-200 rounded-md overflow-hidden ${isHighlighted ? "highlight-pulse" : ""}`} data-category-key={categoryKey}>
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
          {displayTotal > 0 && (
            <div
              data-tour={isFirstCategory ? "requirement-category-progress" : undefined}
              className="flex items-center gap-2 flex-shrink-0"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <span className="text-sm font-medium text-gray-600 tabular-nums">
                {displayValue}/{displayTotal}
              </span>
              <div className="w-4 h-5 bg-gray-200 rounded overflow-hidden flex flex-col-reverse">
                <div
                  className="w-full bg-green-500 rounded transition-all duration-300"
                  style={{ height: `${progressPercent}%` }}
                />
              </div>
              {hasBreakdown && !canHover && (
                <button
                  type="button"
                  onClick={handleInfoClick}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Show credit breakdown"
                >
                  <Info className="w-4 h-4 text-blue-500" />
                </button>
              )}
            </div>
          )}
        </button>

        {hasBreakdown && showTooltip && ReactDOM.createPortal(
          !canHover ? (
            <>
              <div
                className="fixed inset-0 bg-black bg-opacity-30 z-[9998]"
                onClick={() => setShowTooltip(false)}
              />
              <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-slide-up">
                {tooltipContent}
              </div>
            </>
          ) : (
            <div
              className="fixed z-[9999] pointer-events-none"
              style={{
                top: `${tooltipPosition.top}px`,
                left: `${tooltipPosition.left}px`,
                transform: "translateY(-50%)",
              }}
            >
              {tooltipContent}
            </div>
          ),
          document.body
        )}
  
        {isExpanded && (
          <div className={`${hasSubcategories ? "p-3" : "p-3 pt-0"} space-y-2`}>
            {children}
          </div>
        )}
      </div>
    );
  };

export default RequirementCategory;