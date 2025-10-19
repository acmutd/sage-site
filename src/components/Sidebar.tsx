import React, { useState } from "react";
import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import RequirementCategory from "./RequirementCategory";
import CourseBox from "./CourseBox";

// Sidebar Component
interface SidebarProps {
    requirements: {
      title: string;
      completed: number;
      total: number;
      subcategories?: {
        title: string;
        completed: number;
        total: number;
        courses: { code: string; status?: string; icon?: string | null }[];
      }[];
      courses?: { code: string; status?: string; icon?: string | null }[];
    }[];
    expandedCategories: { [key: number]: boolean };
    onToggleCategory: (index: number) => void;
  }
  
  const Sidebar: React.FC<SidebarProps> = ({
    requirements,
    expandedCategories,
    onToggleCategory,
  }) => {
    const [isExpanded, setIsExpanded] = useState(true); // Track sidebar expansion state
  
    const handleToggleSidebar = () => {
      setIsExpanded((prev) => !prev); // Toggle sidebar state
    };
  
    return (
      <div
        className={`${
          isExpanded ? "w-80" : "w-20"
        } bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto h-screen transition-all duration-300`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between mb-6">
          {isExpanded && (
            <button className="flex items-center gap-2 px-4 py-2 bg-green-400 hover:bg-green-500 rounded-full transition-colors">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
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
              {requirements.map((req, idx) => (
                <RequirementCategory
                  key={idx}
                  title={req.title}
                  completed={req.completed}
                  total={req.total}
                  isExpanded={expandedCategories[idx]}
                  onToggle={() => onToggleCategory(idx)}
                  hasSubcategories={!!req.subcategories}
                >
                  {req.subcategories ? (
                    req.subcategories.map((sub, subIdx) => (
                      <div
                        key={subIdx}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-2 bg-white">
                          <div className="flex items-center gap-2">
                            <ChevronDown className="w-3 h-3" />
                            <span className="text-sm font-medium text-gray-700">
                              {sub.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">
                              {sub.completed}/{sub.total}
                            </span>
                            <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
                          </div>
                        </div>
                        <div className="p-2 space-y-1">
                          {sub.courses.map((course, courseIdx) => (
                            <CourseBox
                              key={courseIdx}
                              course={course.code}
                              status={
                                course.status as
                                  | "default"
                                  | "completed"
                                  | "warning"
                                  | "info"
                                  | undefined
                              }
                              icon={
                                course.icon as
                                  | "check"
                                  | "warning"
                                  | "info"
                                  | null
                                  | undefined
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    req.courses?.map((course, courseIdx) => (
                      <CourseBox
                        key={courseIdx}
                        course={course.code}
                        status={
                          course.status as
                            | "default"
                            | "completed"
                            | "warning"
                            | "info"
                            | undefined
                        }
                        icon={
                          course.icon as
                            | "check"
                            | "warning"
                            | "info"
                            | null
                            | undefined
                        }
                      />
                    ))
                  )}
                </RequirementCategory>
              ))}
            </div>
          </>
        )}
        {/* <div className="mt-6 p-3 bg-gray-800 text-white rounded-lg text-xs flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p>
            This app is still in development. If you have any issues or feedback,{' '}
            <span className="text-green-400 underline cursor-pointer">please click here</span>.
          </p>
        </div> */}
      </div>
    );
  };

export default Sidebar;