import React from 'react';
import { ChevronUp, Eraser, Menu, Plus, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface YearDividerProps {
    yearLabel: string;
    yearKey: string;
    isEntirelyUserCreated: boolean;
    hasUserCoursesToClear?: boolean;
    onAddSemester?: (yearKey: string) => void;
    onClearYear?: (yearKey: string) => void;
    onDeleteYear?: (yearKey: string) => void;
    driverObj?: any;
    dropdownWasOpenedRef?: React.MutableRefObject<boolean>;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    semesterCount?: number;
    courseCount?: number;
}

const YearDivider: React.FC<YearDividerProps> = ({
    yearLabel,
    yearKey,
    isEntirelyUserCreated = false,
    hasUserCoursesToClear = false,
    onAddSemester,
    onClearYear,
    onDeleteYear,
    driverObj,
    dropdownWasOpenedRef,
    isCollapsed = false,
    onToggleCollapse,
    semesterCount,
    courseCount,
}) => {
    return (
        <div className="w-full mb-4">
            <div className="flex items-center justify-between mb-2">
                <button
                    data-tour="year-toggle"
                    onClick={onToggleCollapse}
                    className="flex items-center gap-1.5 group text-left"
                    aria-expanded={!isCollapsed}
                    aria-label={isCollapsed ? `Expand ${yearLabel}` : `Collapse ${yearLabel}`}
                >
                    <ChevronUp
                        className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                            isCollapsed ? "-rotate-180" : "rotate-0"
                        }`}
                    />
                    <h2 className="text-lg font-semibold text-gray-700">
                        {yearLabel}
                    </h2>
                    {isCollapsed && (semesterCount !== undefined || courseCount !== undefined) && (
                        <span className="ml-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5 flex-shrink-0">
                            {[
                                semesterCount !== undefined && `${semesterCount} semester${semesterCount !== 1 ? 's' : ''}`,
                                courseCount !== undefined && `${courseCount} course${courseCount !== 1 ? 's' : ''}`,
                            ].filter(Boolean).join(' · ')}
                        </span>
                    )}
                </button>

                <DropdownMenu onOpenChange={(open) => {
                    if (open) {
                        if (dropdownWasOpenedRef) {
                            dropdownWasOpenedRef.current = true;
                        }
                        const currentStep = driverObj?.getActiveIndex?.();
                        if (currentStep === 2) {
                            setTimeout(() => driverObj.moveNext(), 100);
                        }
                    }
                }}>
                    <DropdownMenuTrigger asChild>
                        <button data-tour="year-option" aria-label="Year options" className="hover:bg-gray-100 p-1 rounded">
                            <Menu className="w-5 h-5 text-gray-600" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {onAddSemester && (
                            <DropdownMenuItem 
                                data-tour="add-semester"
                                className="text-[#3eb369] focus:text-[#3eb369] hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100 data-[highlighted]:text-[#3eb369]"
                                onClick={() => onAddSemester(yearKey)}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Semester
                            </DropdownMenuItem>
                        )}
                        
                        {hasUserCoursesToClear && onClearYear && (
                            <DropdownMenuItem 
                                data-tour="clear-all-semesters"
                                className="text-amber-600 focus:text-amber-600 hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100 data-[highlighted]:text-amber-600"
                                onClick={() => onClearYear(yearKey)}
                            >
                                <Eraser className="w-4 h-4 mr-2" />
                                Clear All Semesters
                            </DropdownMenuItem>
                        )}
                        
                        {isEntirelyUserCreated && onDeleteYear && (
                            <DropdownMenuItem 
                                data-tour="delete-year"
                                className="text-destructive focus:text-destructive hover:bg-gray-100 cursor-pointer"
                                onClick={() => onDeleteYear(yearKey)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Year
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="border-t-2 border-dashed border-gray-400"></div>
        </div>
    );
};

export default YearDivider;