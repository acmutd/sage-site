import React from 'react';
import { ChevronUp, Download, Eraser, Menu, Plus, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@sage/ui';
import { exportYearAsCSV, exportYearAsJPG, exportYearAsPDF, exportYearAsPNG, SavedPlannerState } from '@/utils/planExport';

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
    hasCurrentSemester: boolean;
    activePlan?: SavedPlannerState;
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
    hasCurrentSemester = false,
    activePlan,
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
                        aria-hidden="true" 
                    />
                    <h2 className="text-lg font-semibold text-gray-700">
                        {yearLabel}
                    </h2>
                    {isCollapsed && (semesterCount !== undefined || courseCount !== undefined) && (
                        <span className="ml-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-full px-2.5 py-0.5 flex-shrink-0">
                            {[
                                semesterCount !== undefined && `${semesterCount} semester${semesterCount !== 1 ? 's' : ''}`,
                                courseCount !== undefined && `${courseCount} course${courseCount !== 1 ? 's' : ''}`,
                            ].filter(Boolean).join(' · ')}
                        </span>
                    )}
                    {isCollapsed && hasCurrentSemester && (
                        <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                            Current
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
                            <Menu className="w-5 h-5 text-gray-600" aria-hidden="true" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {onAddSemester && (
                            <DropdownMenuItem 
                                data-tour="add-semester"
                                className="md:hidden text-[#3eb369] focus:text-[#3eb369] hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100 data-[highlighted]:text-[#3eb369]"
                                onClick={() => onAddSemester(yearKey)}
                            >
                                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                                Add Semester
                            </DropdownMenuItem>
                        )}
                        
                        {hasUserCoursesToClear && onClearYear && (
                            <DropdownMenuItem 
                                data-tour="clear-all-semesters"
                                className="text-amber-600 focus:text-amber-600 hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100 data-[highlighted]:text-amber-600"
                                onClick={() => onClearYear(yearKey)}
                            >
                                <Eraser className="w-4 h-4 mr-2" aria-hidden="true" />
                                Clear All Semesters
                            </DropdownMenuItem>
                        )}
                        
                        {isEntirelyUserCreated && onDeleteYear && (
                            <DropdownMenuItem 
                                data-tour="delete-year"
                                className="text-destructive focus:text-destructive hover:bg-gray-100 cursor-pointer"
                                onClick={() => onDeleteYear(yearKey)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                                Delete Year
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100">
                                <Download className="w-4 h-4 mr-2" aria-hidden="true"  />
                                Export Year
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-white rounded-2xl shadow-lg p-2">
                                <DropdownMenuItem onClick={() => activePlan && exportYearAsPNG(activePlan, yearKey)}
                                    className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100">PNG</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => activePlan && exportYearAsJPG(activePlan, yearKey)}
                                    className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100">JPG</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => activePlan && exportYearAsPDF(activePlan, yearKey)}
                                    className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100">PDF</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => activePlan && exportYearAsCSV(activePlan, yearKey)}
                                    className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100">CSV</DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="border-t-2 border-dashed border-gray-400"></div>
        </div>
    );
};

export default YearDivider;