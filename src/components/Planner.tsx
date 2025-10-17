import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Lock, Unlock, MoreVertical, Menu, AlertTriangle, Info, CheckCircle, GripVertical } from 'lucide-react';

// CourseBox Component
interface CourseBoxProps {
  code: string;
  status?: 'default' | 'completed' | 'warning' | 'info';
  icon?: 'check' | 'warning' | 'info' | null;
}

const CourseBox: React.FC<CourseBoxProps> = ({ code, status = 'default', icon = null }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return 'border-green-300 bg-white';
      case 'warning':
        return 'border-yellow-400 bg-yellow-50';
      case 'info':
        return 'border-blue-300 bg-white';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getIcon = () => {
    if (icon === 'check') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (icon === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    if (icon === 'info') return <Info className="w-4 h-4 text-blue-500" />;
    return null;
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border-2 ${getStatusStyles()} transition-all hover:shadow-sm`}>
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-700 ml-1">{code}</span>
      </div>
      {getIcon()}
    </div>
  );
};

// SemesterBox Component
interface SemesterBoxProps {
  title: string;
  year: number;
  isLocked?: boolean;
  courses?: { code: string; status?: string; icon?: string | null }[];
  isEmpty?: boolean;
}

const SemesterBox: React.FC<SemesterBoxProps> = ({
    title,
    year,
    isLocked = false,
    courses = [],
    isEmpty = false,
  }) => {
    const [locked, setLocked] = useState(isLocked); // Track lock/unlock state
  
    const handleLockToggle = () => {
      setLocked((prev) => !prev); // Toggle lock state
    };
  
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 min-w-[280px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLockToggle}
              className="hover:bg-gray-100 p-1 rounded"
            >
              {locked ? (
                <Unlock className="w-4 h-4 text-gray-400" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <button className="hover:bg-gray-100 p-1 rounded">
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
  
        {isEmpty ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            No classes were taken in this semester
          </p>
        ) : courses.length === 0 ? (
          <div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
            Drag and drop classes here
          </div>
        ) : (
          <div className="space-y-2">
            {courses.map((course, idx) => (
              <CourseBox
                key={idx}
                {...course}
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
        )}
      </div>
    );
  };

// RequirementCategory Component
interface RequirementCategoryProps {
  title: string;
  completed: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hasSubcategories?: boolean;
}

const RequirementCategory: React.FC<RequirementCategoryProps> = ({
    title,
    completed,
    total,
    isExpanded,
    onToggle,
    children,
    hasSubcategories = false,
  }) => {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span className="text-sm font-medium text-gray-800">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">
              {completed}/{total}
            </span>
            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
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
                            {...course}
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
                      {...course}
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

// Main App Component
const PlannerPage = () => {
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true
  });

  const requirements = [
    {
      title: 'Core Requirements',
      completed: 24,
      total: 74,
      courses: undefined
    },
    {
      title: 'Major Preparatory Requirements',
      completed: 24,
      total: 74,
      subcategories: [
        {
          title: 'Science',
          completed: 2,
          total: 3,
          courses: [
            { code: 'CS1200', status: 'completed', icon: 'check' },
            { code: 'CS1200', status: 'completed', icon: 'check' },
            { code: 'CS1200', status: 'default' }
          ]
        },
        {
          title: 'Science',
          completed: 0,
          total: 3,
          courses: [
            { code: 'CS1200', status: 'default' },
            { code: 'CS1200', status: 'default' },
            { code: 'CS1200', status: 'default' }
          ]
        }
      ]
    },
    {
      title: 'Major Preparatory Requirements',
      completed: 24,
      total: 74,
      courses: undefined
    }
  ];

  const year1Semesters = [
    {
      title: 'Fall 2024',
      year: 1,
      courses: [
        { code: 'CS1200', status: 'default' },
        { code: 'CS1200', status: 'info', icon: 'info' },
        { code: 'CS1200', status: 'warning', icon: 'warning' },
        { code: 'CS1200', status: 'default' },
        { code: 'CS1200', status: 'default' }
      ]
    },
    {
      title: 'Spring 2025',
      year: 1,
      isEmpty: true
    },
    {
      title: 'Summer 2025',
      year: 1,
      isLocked: true,
      courses: [
        { code: 'CS1200', status: 'default' },
        { code: 'CS1200', status: 'default' },
        { code: 'CS1200', status: 'default' },
        { code: 'CS1200', status: 'default' }
      ]
    }
  ];

  const year2Semesters = [
    {
      title: 'Fall 2025',
      year: 2,
      courses: []
    },
    {
      title: 'Spring 2026',
      year: 2,
      isLocked: true,
      courses: [
        { code: 'CS1200', status: 'default' },
        { code: 'CS1200', status: 'default' },
        { code: 'CS1200', status: 'default' },
        { code: 'CS1200', status: 'default' }
      ]
    },
    {
      title: 'Summer 2026',
      year: 2,
      isLocked: true,
      courses: [
        { code: 'CS1200', status: 'default' },
        { code: 'CS1200', status: 'default' },
        { code: 'CS1200', status: 'default' },
        { code: 'CS1200', status: 'default' },
        { code: 'CS1200', status: 'default' }
      ]
    }
  ];

  const year3Semesters = [
    {
      title: 'Fall 2026',
      year: 3,
      isLocked: true,
      courses: []
    },
    {
      title: 'Spring 2027',
      year: 3,
      isLocked: true,
      courses: []
    },
    {
      title: 'Summer 2027',
      year: 3,
      isLocked: true,
      courses: []
    }
  ];

  const toggleCategory = (index: number) => {
    setExpandedCategories(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        requirements={requirements}
        expandedCategories={expandedCategories}
        onToggleCategory={toggleCategory}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-8">
          {/* Year 1 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Year 1</h2>
              <button className="p-1 hover:bg-gray-200 rounded">
                <Menu className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {year1Semesters.map((semester, idx) => (
                <SemesterBox key={idx} {...semester} />
              ))}
            </div>
          </div>

          {/* Year 2 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Year 2</h2>
              <button className="p-1 hover:bg-gray-200 rounded">
                <Menu className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {year2Semesters.map((semester, idx) => (
                <SemesterBox key={idx} {...semester} />
              ))}
            </div>
          </div>

          {/* Year 3 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Year 3</h2>
              <button className="p-1 hover:bg-gray-200 rounded">
                <Menu className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {year3Semesters.map((semester, idx) => (
                <SemesterBox key={idx} {...semester} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlannerPage;
