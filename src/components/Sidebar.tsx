import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, ChevronLeft, NotebookPen } from "lucide-react";
import RequirementCategory from "./RequirementCategory";
import CourseBox from "./CourseBox";
import ProgramValidationA from "./ProgramValidationA";
import FileUploader from "./FileUpload";

// Sidebar Component
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
}

const Sidebar: React.FC<SidebarProps> = ({
    requirements,
    //expandedCategories,
    //onToggleCategory,
    transcriptData
}) => {
    const [isExpanded, setIsExpanded] = useState(true); // Track sidebar expansion state
    const [expandedSubcategories, setExpandedSubcategories] = useState<Record<string, boolean>>({});
    const [isProgramValidationOpen, setIsProgramValidationOpen] = useState(false); // Track if ProgramValidationA is open
    const [showUploadView, setShowUploadView] = useState(false); // transcript upload
    const [autoExpandedCategories, setAutoExpandedCategories] = useState<{ [key: number]: boolean }>({});
    const dropdownRef = useRef<HTMLDivElement>(null); // Ref for the dropdown

    const handleToggleSidebar = () => {
        setIsExpanded((prev) => !prev); // Toggle sidebar state
    };

    useEffect(() => {
        // Automatically collapse categories without suggested courses
        const initialExpandedState: { [key: number]: boolean } = {};
        requirements.forEach((req, reqIdx) => {
          const hasSuggestedCourses = req.categories.some(
            (category: any) => category.suggested && category.suggested.length > 0
          );
          initialExpandedState[reqIdx] = hasSuggestedCourses; // Expand only if there are suggested courses
        });
        setAutoExpandedCategories(initialExpandedState);
      }, [requirements]);

      const handleOpenProgramValidation = () => {
        setIsProgramValidationOpen(true); // Open the ProgramValidationA modal
      };
    
      const handleCloseProgramValidation = (e?: MouseEvent) => {
        // Ensure clicks inside the dropdown do not close the modal
        if (
          e &&
          dropdownRef.current &&
          dropdownRef.current.contains(e.target as Node)
        ) {
          return;
        }
        setIsProgramValidationOpen(false); // Close the modal
      };

    // USED TO CALL LAMBDA TO UPDATE PROGRAMS LATER
    const handleSavePrograms = (updatedPrograms: any[]) => {
        console.log("Updated programs:", updatedPrograms);

        // // Example: Call an API endpoint to update the programs
        // fetch("/api/update-programs", {
        //     method: "POST",
        //     headers: {
        //         "Content-Type": "application/json",
        //     },
        //     body: JSON.stringify(updatedPrograms),
        // })
        //     .then((response) => response.json())
        //     .then((data) => {
        //         console.log("Programs updated successfully:", data);
        //     })
        //     .catch((error) => {
        //         console.error("Error updating programs:", error);
        //     });

        handleCloseProgramValidation(); // Close the modal
    };

    const handleToggleSubcategory = (reqIdx: number, catIdx: number) => {
        const key = `${reqIdx}-${catIdx}`;
        setExpandedSubcategories((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // Check if a subcategory is expanded
    const isSubcategoryExpanded = (reqIdx: number, catIdx: number) => {
        const key = `${reqIdx}-${catIdx}`;
        // Default to true if not explicitly set
        return expandedSubcategories[key] !== false;
    };

    console.log(requirements[0]?.categories?.[0]?.classes);

    // Recursive function to render categories and subcategories
    const renderCategories = (categories: any[], reqIdx: number, parentCatIdx: number = 0) => {
        return categories.map((category, catIdx) => {
            const currentCatIdx = `${parentCatIdx}-${catIdx}`;
            return (
                <div
                    key={currentCatIdx}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                >
                    <div
                        className="flex items-center justify-between p-2 bg-white cursor-pointer hover:bg-gray-50"
                        onClick={() => handleToggleSubcategory(reqIdx, parseInt(currentCatIdx))}
                    >
                        <div className="flex items-center gap-2">
                            {isSubcategoryExpanded(reqIdx, parseInt(currentCatIdx)) ? (
                                <ChevronDown className="w-3 h-3" />
                            ) : (
                                <ChevronRight className="w-3 h-3" />
                            )}
                            <span className="text-sm font-medium text-gray-700">
                                {category.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">
                                {category.progress}/{category.total}
                            </span>
                            <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
                        </div>
                    </div>

                    {isSubcategoryExpanded(reqIdx, parseInt(currentCatIdx)) && (
                        <div className="p-2 space-y-1">
                            {/* Render classes */}
                            {category.classes && category.classes.length > 0 ? (
                                category.classes.map((course: any, courseIdx: number) => (
                                    <CourseBox
                                        key={courseIdx}
                                        course={{
                                            course_code: course.code,
                                            credits_earned: course.credits,
                                            course_name: course.name,
                                            semester: course.semester,
                                            status: course.status,
                                        }}
                                        status={
                                            course.status as
                                            | "default"
                                            | "completed"
                                            | "warning"
                                            | "info"
                                            | undefined
                                        }
                                        icon={
                                            course.status === "completed" ? "check" : null
                                        }
                                        isFromTranscript={true}
                                    />
                                ))
                            ) : category.categories && category.categories.length > 0 ? null : (
                                <div className="text-sm text-gray-500">
                                    No courses in this category
                                </div>
                            )}

                            {/* Render suggested courses */}
                            {category.suggested && category.suggested.length > 0 && (
                                <>
                                    <div className="mt-2 mb-1 border-t border-gray-100 pt-1">
                                        <span className="text-xs text-gray-500 font-medium">
                                            Suggested Courses
                                        </span>
                                    </div>
                                    {category.suggested.map((course: {
                                        code: string;
                                        name: string;
                                        corequisites: string[];
                                        excluded: string[];
                                        required_core: boolean;
                                        repeatable_for_hours: number;
                                        notes: string;
                                        description: string;
                                    }, idx: number) => (
                                        <CourseBox
                                            key={`suggested-${idx}`}
                                            course={{
                                                course_code: course.code,
                                                course_name: course.name,
                                                description: course.description,
                                            }}
                                            status="warning"
                                            icon="info"
                                            isSuggested={true}
                                        />
                                    ))}
                                </>
                            )}

                            {/* Render subcategories recursively */}
                            {category.categories &&
                                category.categories.length > 0 &&
                                renderCategories(category.categories, reqIdx, parseInt(currentCatIdx))}
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <>
            <div
                className={`${isExpanded ? "w-80" : "w-20"
                    } bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto h-screen transition-all duration-300`}
            >
                {/* Sidebar Header */}
                <div className="flex items-center justify-between mb-6">
                    {isExpanded && (
                        <button className="flex items-center gap-2 px-4 py-2 bg-green-400 hover:bg-green-500 rounded-full transition-colors"
                            onClick={handleOpenProgramValidation}
                        >
                            <NotebookPen className="w-4 h-4" strokeWidth={2} />
                            <span className="text-sm font-medium">Edit plans</span>
                        </button>
                    )}
                    <button
                        className="p-2 hover:bg-gray-200 rounded"
                        onClick={handleToggleSidebar}
                    >
                        {isExpanded ? (
                            <ChevronLeft className="w-5 h-5 text-gray-500" />
                        ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                    </button>
                </div>

                {/* Sidebar Content */}
                {isExpanded && (
                    <>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Degree Requirements
                        </h2>

                        <div className="space-y-3">
                            {requirements.map((req, reqIdx) => (
                                <RequirementCategory
                                    key={reqIdx}
                                    title={req.degree}
                                    completed={req.progress}
                                    total={req.total}
                                    isExpanded={autoExpandedCategories[reqIdx]}                                    onToggle={() => {
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
                    </>
                )}
            </div>
            {isProgramValidationOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl relative">
                        <button
                            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
                            onClick={() => {
                                setIsProgramValidationOpen(false);
                                setShowUploadView(false);
                            }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {showUploadView ? (
                            <FileUploader
                                userId={transcriptData?.student_id || ""}
                                onNext={(data) => {
                                    console.log("Uploaded data:", data);
                                    setShowUploadView(false);
                                    setIsProgramValidationOpen(false);
                                }}
                                showManualOption={true}  // Add this
                                onManualFill={() => setShowUploadView(false)}  // Add this
                            />
                        ) : (
                            <ProgramValidationA
                                dropdownRef={dropdownRef}
                                onNext={(updatedPrograms) => handleSavePrograms(updatedPrograms)}
                                transcriptData={transcriptData}
                                showUploadOption={true}  // Add this
                                onUploadClick={() => setShowUploadView(true)}  // Add this
                            />
                        )}
                    </div>
                </div>
            )}       
        </>
    );
};

export default Sidebar;