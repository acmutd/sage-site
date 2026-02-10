import React, { useEffect, useMemo, useRef, useState } from "react";
import Joyride, { Step } from "react-joyride";
import Sidebar from "./Sidebar";
import SemesterBox from "./SemesterBox";
import { HelpCircle, Plus, PlusCircle, SquareAsterisk, Save, Check, Loader2} from "lucide-react";
import PlannerNavbar from "./PlannerNavbar";
import { Toaster, toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import Cookies from "js-cookie";

interface PlannerProps {
    semesters: {
        [key: string]: { title: string; courses: any[]; isFromTranscript?: boolean }[];
    };
    requirements: any;
    transcriptData: any;
    onRestartOnboarding?: () => void;
}

interface SavedPlannerState {
  semesters: {
    [key: string]: {
      title: string;
      courses: any[];
      isFromTranscript?: boolean;
      isLocked?: boolean;  
    }[];
  };
  placedCourses: string[];
}

const Planner: React.FC<PlannerProps> = ({ semesters, requirements, transcriptData, onRestartOnboarding }) => {
    // main planner scroll ref
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    
    // tutorial screen
    const [runTour, setRunTour] = useState(() => {
        const hasSeenTutorial = localStorage.getItem('hasSeenPlannerTutorial');
        console.log('hasSeenTutorial:', hasSeenTutorial);
        console.log('runTour will be:', !hasSeenTutorial);
        return !hasSeenTutorial; // Only run if user has not seen it
    });

    const handleJoyrideCallback = (data: any) => {
        const { status, index, type } = data;

        if (type === 'step:after' && index === 2) { // Before the "add-year" step
            scrollContainerRef.current?.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }

        if (status === 'finished' || status === 'skipped') {
            localStorage.setItem('hasSeenPlannerTutorial', 'true');
            setRunTour(false);
        }
    };

    const startTutorial = () => { setRunTour(true); };

    const steps: Step[] = [
        {
          target: '[data-tour="sidebar"]',
          content: "This sidebar shows your degree requirements and suggested courses (when you expand the categories).",
          placement: "right",
          disableScrolling: true
        },
        {
          target: '[data-tour="semester-area"]',
          content: "This is your academic plan. Drag courses here to build your schedule.",
          placement: "top"
        },
        {
          target: '[data-tour="add-semester"]',
          content: "Add a new semester to the selected year. You can have up to three semester per year (Fall, Spring, Summer). You also have three dots on each semester box to remove it and clear courses. You can also lock semesters to prevent dragging things into them.",
          placement: "bottom"
        },
        {
          target: '[data-tour="add-year"]',
          content: "Add another academic year to your plan. When deleting the last semester in a year, the entire year will be removed.",
          placement: "top",
          disableScrolling: true
        }
      ];
    
    // Initialize planner state
    const initialPlannerState = useMemo(() => {
        const updatedSemesters = { ...semesters };
        Object.keys(updatedSemesters).forEach((yearKey) => {
            updatedSemesters[yearKey] = updatedSemesters[yearKey].map((semester, semIdx) => ({
                ...semester,
                isFromTranscript: true, // Mark all semesters as from transcriptData
                isLocked: false,
                courses: semester.courses.map(course => ({
                    ...course,
                    originalLocation: { yearKey, semesterIndex: semIdx } // dragging to origin
                }))
            }));
        });
        return updatedSemesters;
    }, [semesters]);

    const [plannerState, setPlannerState] = useState<SavedPlannerState>(() => {
        const stored = localStorage.getItem('planner-state');

        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (error) {
                console.error('Failed to parse localStorage:', error);
            }
        }
        
        return {
            semesters: initialPlannerState,
            placedCourses: []
        };
    });

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const updatePlannerState = (updates: Partial<SavedPlannerState>) => {
        setPlannerState(prev => ({ ...prev, ...updates }));
        setHasUnsavedChanges(true);
    };

    const allSemesters = plannerState.semesters;
    const placedSuggestedCourses = new Set(plannerState.placedCourses);

    const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({
        0: true,
        1: true,
        2: true,
    });
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarCollapsedDelayed, setSidebarCollapsedDelayed] = useState(false);

    useEffect(() => {
        if (sidebarCollapsed) {
            setTimeout(() => setSidebarCollapsedDelayed(true), 150);
        } else {
            setSidebarCollapsedDelayed(false);
        }
    }, [sidebarCollapsed]);

    // Handle save to cloud
    const handleSave = async () => {
        if (!user) {
            toast.error('You must be logged in to save');
            return;
        }

        const token = Cookies.get('authToken');
        if (!token) {
            toast.error('Authentication token not found');
            return;
        }

        setIsLoading(true);
        try {
            const CRUD_API = import.meta.env.VITE_CRUD_API;
            
            const response = await fetch(CRUD_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.uid,
                    action: 'savePlanner',
                    token,
                    plannerState: plannerState,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save planner');
            }

            // Move local storage save here

            setHasUnsavedChanges(false);
            toast.success('Saved your plan');
        } catch (error) {
            toast.error('Failed to save. Try again.');
        } finally {
            // Save to localStorage on successful cloud save
            try {
                localStorage.setItem('planner-state', JSON.stringify(plannerState));
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
            }
            setIsLoading(false);
        }
    };

    // Warn on page unload if unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);


    const [error, setError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [semesterToDelete, setSemesterToDelete] = useState<{
        yearKey: string;
        semesterIndex: number;
        isLastSemester: boolean;
        action: 'clear' | 'delete';
    } | null>(null);

    const errorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (error && scrollContainerRef.current) {
            setTimeout(() => {
                scrollContainerRef.current?.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                });
            }, 200);
        }
    }, [error]);


    
    useEffect(() => {
        const handleResize = () => {
          if (window.innerWidth < 1024 && window.innerWidth >= 768) {
            setSidebarCollapsed(true);
          } else if (window.innerWidth >= 1024) {
            setSidebarCollapsed(false);
          }
        };
        
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const adaptedRequirements = useMemo(() => {
        return requirements;
    }, [requirements]);

    // Collect all suggested courses with corequisites and their category locations
    const allSuggestedCourses = useMemo(() => {
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
        
        adaptedRequirements.forEach((req: any) => {
            if (req.categories) {
                collectSuggestedCourses(req.categories, [req.degree]);
            }
        });
        
        return courses;
    }, [adaptedRequirements]);

    // phone mode
    const availableSemesters = useMemo(() => {
        const semesters: Array<{yearKey: string, semesterIndex: number, title: string}> = [];
        Object.keys(allSemesters).forEach(yearKey => {
            allSemesters[yearKey].forEach((semester, idx) => {
                if (!semester.isFromTranscript) {
                    semesters.push({
                        yearKey,
                        semesterIndex: idx,
                        title: semester.title
                    });
                }
            });
        });
        return semesters;
    }, [allSemesters]);

    const handleDropCourse = (
        targetYear: string,
        targetSemesterIndex: number,
        course: any,
        sourceYear: string,
        sourceSemesterIndex: number,
        courseId?: string,
        isSuggested?: boolean
    ) => {
            console.log("=== DROP OPERATION START ===");
            console.log("Course being moved:", course);
            console.log("Course ID used for finding:", courseId || course?.id);
            console.log("Source year/semester:", sourceYear, sourceSemesterIndex);
            console.log("Target year/semester:", targetYear, targetSemesterIndex);
            console.log("Is suggested course:", isSuggested);
                        
            // removal logic
            const isRemoval = !course || !targetYear || 
                targetYear === '' || 
                targetSemesterIndex === undefined || 
                targetSemesterIndex === null ||
                targetSemesterIndex < 0; 

            if (isRemoval) {
                const newState = JSON.parse(JSON.stringify(allSemesters));
                const sourceSemester = newState[sourceYear]?.[sourceSemesterIndex];
                if (sourceSemester?.courses) {
                    const courseIndex = sourceSemester.courses.findIndex(
                        (c: any) => c.id === courseId
                    );
                    if (courseIndex !== -1) {
                        const removedCourse = sourceSemester.courses[courseIndex];
                        // If the course being removed was originally suggested, unmark it
                        if (removedCourse.status === 'planned') {
                            const courseCode = removedCourse.course_code || removedCourse.code;
                            updatePlannerState({
                                placedCourses: Array.from(placedSuggestedCourses).filter(c => c !== courseCode)
                            });
                        }
                        sourceSemester.courses.splice(courseIndex, 1);
                    }
                }
                updatePlannerState({ semesters: newState})
                return;
            }

            const courseCode = course.code || course.course_code;
            if (!isSuggested && course.originalLocation) {
                const isOriginalLocation = 
                    targetYear === course.originalLocation.yearKey && 
                    targetSemesterIndex === course.originalLocation.semesterIndex;
                
                if (!isOriginalLocation) {
                    setError(`${courseCode} can only be moved back to ${allSemesters[course.originalLocation.yearKey][course.originalLocation.semesterIndex].title}`);
                    return;
                }
            }
            
            // Check if course exists anywhere else in the plan
            for (const yearKey in allSemesters) {
                for (let idx = 0; idx < allSemesters[yearKey].length; idx++) {
                    const semester = allSemesters[yearKey][idx];
                    // Skip the source semester
                    if (yearKey === sourceYear && idx === sourceSemesterIndex) continue;
                    
                    const exists = semester.courses.some(c => c.course_code === courseCode);
                    if (exists) {
                        setError(`${courseCode} is already in ${semester.title}`);
                        return;
                    }
                }
            }

            // Create deep copies to avoid mutation
            const newState = JSON.parse(JSON.stringify(allSemesters));

            // For suggested courses, we don't need to remove from source
            // Just add a new copy to the target
            if (isSuggested) {
                const targetSemester = newState[targetYear][targetSemesterIndex];
                if (targetSemester && Array.isArray(targetSemester.courses)) {
                    // Create a proper course object from the suggestion
                    const newCourseId = `${targetYear}-${targetSemester.title}-${course.course_code}-${targetSemester.courses.length}-${Date.now()}`;

                    const newCourse = {
                        course_code: course.code || course.course_code,
                        course_name: course.name || course.course_name || `${course.code || course.course_code} Course`,
                        credits: course.credits || 3, // Default credits if not specified
                        id: newCourseId,
                        status: 'planned'
                    };

                    targetSemester.courses.push(newCourse);
                    console.log("Added suggested course to target:", newCourse);
                    
                    // Mark this course as placed
                    updatePlannerState({
                        semesters: newState,
                        placedCourses: Array.from(new Set([...placedSuggestedCourses, courseCode]))
                    });
                }

                return;
            }

            // For regular courses, handle as before
            // Find and remove the exact course from the source
            if (sourceYear && sourceSemesterIndex !== undefined) {
                const sourceSemester = newState[sourceYear][sourceSemesterIndex];
                if (sourceSemester && Array.isArray(sourceSemester.courses)) {
                    const courseIndex = sourceSemester.courses.findIndex(
                        (c: any) => c.id === courseId
                    );

                    if (courseIndex !== -1) {
                        // Remove this specific course
                        const [removedCourse] = sourceSemester.courses.splice(courseIndex, 1);
                        console.log("Successfully removed course:", removedCourse);

                        // Add to the target semester
                        if (targetYear && targetSemesterIndex !== undefined) {
                            const targetSemester = newState[targetYear][targetSemesterIndex];
                            if (targetSemester && Array.isArray(targetSemester.courses)) {
                                targetSemester.courses.push(removedCourse);
                                console.log("Added course to target:", removedCourse);
                            }
                        }
                    } else {
                        console.error(`Course with ID ${courseId} not found in source semester`);
                    }
                }
            }

            console.log("=== DROP OPERATION END ===");
            updatePlannerState({ semesters: newState });
    };
    const toggleCategory = (index: number) => {
        setExpandedCategories((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    const getNextYearNumber = () => {
        const yearNumbers = Object.keys(allSemesters)
            .map(key => parseInt(key.replace('year', '')))
            .filter(num => !isNaN(num));

        if (yearNumbers.length === 0) return 1;
        return Math.max(...yearNumbers) + 1;
    };

    const handleAddYear = () => {
        const nextYearNum = getNextYearNumber();
        const nextYear = `year${nextYearNum}`;

        // Find the last year in the existing semesters to determine the next calendar year
        let nextFallYear;

        if (Object.keys(allSemesters).length === 0) {
            // If there are no years yet, start with the current year
            nextFallYear = new Date().getFullYear();
        } else {
            // Find the latest semester's year and determine the next one
            const lastYearKey = Object.keys(allSemesters).sort().pop();
            if (lastYearKey) {
                const lastSemesters = allSemesters[lastYearKey];
                // Find the last Fall semester's year or use the last semester's year
                const lastSemester = lastSemesters[lastSemesters.length - 1];
                const lastYear = parseInt(lastSemester.title.split(' ')[1]);

                // If the last semester is Summer, the next Fall should be in the same year
                // If it's Spring or Fall, the next Fall should be in the next year
                if (lastSemester.title.includes('Summer')) {
                    nextFallYear = lastYear;
                } else if (lastSemester.title.includes('Spring')) {
                    nextFallYear = lastYear;
                } else { // Fall
                    nextFallYear = lastYear + 1;
                }
            } else {
                nextFallYear = new Date().getFullYear();
            }
        }

        updatePlannerState({
            semesters: {
                ...allSemesters,
                [nextYear]: [
                    { title: `Fall ${nextFallYear}`, courses: [], isLocked: false }
                ]
            }
        });
    };

    const handleAddSemester = (yearKey: string) => {
        const yearSemesters = [...allSemesters[yearKey]];

        if (yearSemesters.length >= 3) {
            setError(`Cannot add more than 3 semesters (Fall, Spring, Summer) to ${yearKey.replace("year", "Year ")}`);
            return;
        }

        setError(null);

        const firstSemester = yearSemesters[0];
        const baseYear = parseInt(firstSemester.title.split(' ')[1]);

        const allPossibleSemesters = [
            { title: `Fall ${baseYear}`, courses: [], isFromTranscript: false, isLocked: false },
            { title: `Spring ${baseYear + 1}`, courses: [], isFromTranscript: false, isLocked: false },
            { title: `Summer ${baseYear + 1}`, courses: [], isFromTranscript: false, isLocked: false }
        ];

        const existingTitles = yearSemesters.map(s => s.title);
        const missingSemesters = allPossibleSemesters.filter(
            sem => !existingTitles.includes(sem.title)
        );

        if (missingSemesters.length === 0) {
            return;
        }
        
        const updatedSemesters = [...yearSemesters, missingSemesters[0]];
        updatedSemesters.sort((a, b) => {
            const order: Record<string, number> = { 'Fall': 0, 'Spring': 1, 'Summer': 2 };
            const seasonA = a.title.split(' ')[0];
            const seasonB = b.title.split(' ')[0];
            return order[seasonA] - order[seasonB];
        });

        updatePlannerState({
            semesters: {
                ...allSemesters,
                [yearKey]: updatedSemesters
            }
        });
    };

    const handleClearSemester = (yearKey: string, semesterIndex: number) => {
        if (!semesterToDelete) return;

        const semesterToClear = allSemesters[yearKey]?.[semesterIndex];
        if (semesterToClear?.courses) {
            const courseCodesToRemove: string[] = [];
            semesterToClear.courses.forEach((course: any) => {
                if (course.status === 'planned') {
                    const courseCode = course.course_code || course.code;
                    if (courseCode) {
                        courseCodesToRemove.push(courseCode);
                    }
                }
            });
            
            if (courseCodesToRemove.length > 0) {
                const newPlaced = new Set(placedSuggestedCourses);
                courseCodesToRemove.forEach(code => newPlaced.delete(code));
                updatePlannerState({
                    placedCourses: Array.from(newPlaced)
                });
            }
        }

        const newState = JSON.parse(JSON.stringify(allSemesters));
        newState[yearKey][semesterIndex].courses = [];
        updatePlannerState({ semesters: newState });
       
        //Close modal and reset state
        setShowDeleteModal(false);
        setSemesterToDelete(null);
    }

    const handleRemoveSemester = (yearKey: string, semesterIndex: number) => {
        if (!semesterToDelete) return;
        
        // Get the courses from the semester being removed
        const semesterToRemove = allSemesters[yearKey]?.[semesterIndex];
        if (semesterToRemove?.courses) {
            // Collect all placed suggested courses from this semester
            const courseCodesToRemove: string[] = [];
            semesterToRemove.courses.forEach((course: any) => {
                if (course.status === 'planned') {
                    const courseCode = course.course_code || course.code;
                    if (courseCode) {
                        courseCodesToRemove.push(courseCode);
                    }
                }
            });
            
            // Remove them all at once
            if (courseCodesToRemove.length > 0) {
                const newPlaced = new Set(placedSuggestedCourses);
                courseCodesToRemove.forEach(code => newPlaced.delete(code));
                updatePlannerState({
                   placedCourses: Array.from(newPlaced) 
                });
            }
        }
        
        const yearSemesters = [...allSemesters[yearKey]];
        
        if (yearSemesters.length === 1) {
            const newState = { ...allSemesters };
            delete newState[yearKey];
            updatePlannerState({ semesters: newState });
        } else {
            yearSemesters.splice(semesterIndex, 1);
            updatePlannerState({
                semesters: {
                    ...allSemesters,
                    [yearKey]: yearSemesters
                }
            });
        }
        
        // Close modal and reset state
        setShowDeleteModal(false);
        setSemesterToDelete(null);
    };

    const openClearDeleteModal = (yearKey: string, semesterIndex: number, action: 'clear' | 'delete') => {
        const yearSemesters = allSemesters[yearKey];
        const isLastSemester = yearSemesters.length === 1;
        
        setSemesterToDelete({ yearKey, semesterIndex, isLastSemester, action});
        setShowDeleteModal(true);
    };

    console.log(allSemesters)

    return (
        <>
            <Toaster position="top-center" richColors />
            <PlannerNavbar 
                key={Object.keys(allSemesters).length}
                requirements={adaptedRequirements}
                expandedCategories={expandedCategories}
                onToggleCategory={toggleCategory}
                transcriptData={transcriptData}
                onDropCourse={(courseId, sourceYear, sourceSemesterIndex) => 
                    handleDropCourse('', -1, null, sourceYear, sourceSemesterIndex, courseId, false)
                }
                placedSuggestedCourses={placedSuggestedCourses}
                onRestartOnboarding={onRestartOnboarding}
                availableSemesters={availableSemesters}
                onAddCourse={handleDropCourse}
            />
            <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] mt-[4rem] bg-gray-50 overflow-hidden p-6">
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10000 }}>
                    <Joyride
                        steps={steps}
                        run={runTour}
                        callback={handleJoyrideCallback}
                        continuous
                        showProgress
                        showSkipButton
                        styles={{
                            options: {
                                primaryColor: '#4ade80',
                                zIndex: 10000,
                            }
                        }}
                    />
                </div>

                {/* Save button */}
                <button 
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || isLoading}
                    className={`fixed bottom-4 right-24 px-4 py-2 rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 z-50 ${
                        hasUnsavedChanges
                            ? 'hover:-translate-y-0.5 motion-safe:animate-pulse'
                            : 'cursor-default'
                    } text-white font-medium text-sm`}
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : hasUnsavedChanges ? (
                        <>
                            <Save size={18} />
                            <span>Save</span>
                        </>
                    ) : (
                        <>
                            <Check size={18} />
                            <span>Saved</span>
                        </>
                    )}
                </button>

                {/* Help button */}
                <button onClick={startTutorial} className="fixed bottom-4 right-12 w-7 h-7 rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center z-50">
                        <HelpCircle size={18} className="text-white" />
                </button>

                <div className="h-[calc(100%-2rem)] pl-1 pr-6 py-6 pb-12 flex flex-col gap-4 hidden md:flex p-6">
                    <Sidebar
                        requirements={adaptedRequirements}
                        expandedCategories={expandedCategories}
                        onToggleCategory={toggleCategory}
                        transcriptData={transcriptData}
                        onDropCourse={(courseId, sourceYear, sourceSemesterIndex) => 
                            handleDropCourse('', -1, null, sourceYear, sourceSemesterIndex, courseId, false)
                        }
                        isExpanded={!sidebarCollapsed}
                        onToggleExpanded={() => setSidebarCollapsed(!sidebarCollapsed)}
                        placedSuggestedCourses={placedSuggestedCourses}
                        onRestartOnboarding={onRestartOnboarding}
                    />
                    
                    <div 
                        className={`${sidebarCollapsed ? "cursor-pointer rounded-md w-20" : "rounded-full w-80"} bg-gray-900 py-3 px-6 flex gap-2 justify-center items-center transition-all duration-300 absolute bottom-8`}
                        onClick={sidebarCollapsed ? () => setSidebarCollapsed(false) : undefined}
                    >
                        <SquareAsterisk size={32} className="stroke-green-400 flex-shrink-0" />
                            <small className={`${sidebarCollapsedDelayed ? "hidden" : "block"} text-white text-xs`}>
                                This app is in development. For issues or feedback,
                                <a
                                    href="https://docs.google.com/forms/d/1RX5YAecyJPVdbU_czip_rPm9d3w1LCLwwQVg06hG-dQ/edit"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent underline ml-1"
                                >
                                click here.
                            </a>
                        </small>
                    </div>
                </div>

                
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6" style={{ scrollBehavior: 'smooth' }}>
                    {/* <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">Academic Plan</h1>
                        <button
                            onClick={handleAddYear}
                            className="flex items-center gap-2 px-4 py-2 bg-green-400 hover:bg-green-500 rounded-full text-sm font-medium transition-colors"
                        >
                            <PlusCircle className="w-5 h-5" />
                            <span>Add Year</span>
                        </button>
                    </div> */}
                    {error && (
                        <div
                            ref={errorRef}
                            className="mb-4 mt-2 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded shadow-sm"
                        >
                            <div className="flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd"
                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 01-1-1v-4a1 1 0 112 0v4a1 1 0 01-1 1z"
                                        clipRule="evenodd" />
                                </svg>
                                <span>{error}</span>
                                <button
                                    onClick={() => setError(null)}
                                    className="ml-auto text-red-700 hover:text-red-900"
                                >
                                    Ã—
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-8">
                        {Object.keys(allSemesters).map((yearKey) => (
                            <div key={yearKey}>
                                <div className="flex justify-between items-center mb-4">

                                    <h2 className="text-lg font-semibold text-gray-700 mb-4">
                                        {yearKey.replace("year", "Year ")} {/* Optional formatting */}
                                    </h2>
                                    <button
                                        data-tour="add-semester"
                                        onClick={() => handleAddSemester(yearKey)}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-400 hover:bg-green-500 rounded-full text-sm font-medium transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Add Semester</span>
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-4 justify-start" data-tour="semester-area">
                                    {allSemesters[yearKey].map((semester, idx) => (
                                        <SemesterBox
                                            key={idx}
                                            {...semester}
                                            yearKey={yearKey}
                                            semesterIndex={idx}
                                            isFromTranscript={semester.isFromTranscript || false} // Dynamically set isFromTranscript
                                            onDropCourse={(course, sourceYear, sourceSemesterIndex, courseId, isSuggested) =>
                                                handleDropCourse(yearKey, idx, course, sourceYear, sourceSemesterIndex, courseId, isSuggested)
                                            }
                                            onClearSemester={() => openClearDeleteModal(yearKey, idx, 'clear')}
                                            onRemoveSemester={() => openClearDeleteModal(yearKey, idx, 'delete')}
                                            onShowError={setError}
                                            allSuggestedCourses={allSuggestedCourses}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    {Object.keys(allSemesters).length > 0 && (
                        <div className="mt-8 mb-16 flex justify-end">  {/* mb-16 = 4rem spacing */}
                            <button
                                data-tour="add-year"
                                onClick={handleAddYear}
                                className="flex items-center gap-2 px-4 py-2 bg-green-400 hover:bg-green-500 rounded-full text-sm font-medium transition-colors"
                            >
                                <PlusCircle className="w-4 h-4" />
                                <span>Add Another Year</span>
                            </button>
                        </div>
                    )}

                    {/* Delete Modal */}
                    {showDeleteModal && semesterToDelete && (
                        <div 
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]"
                            onClick={() => {
                                setShowDeleteModal(false);
                                setSemesterToDelete(null);
                            }}
                        >
                            <div 
                                className="bg-white p-6 rounded-md shadow-lg w-full max-w-md"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                                    {semesterToDelete.action === 'clear'
                                        ? `Clear ${allSemesters[semesterToDelete.yearKey][semesterToDelete.semesterIndex].title}?`
                                        : semesterToDelete.isLastSemester 
                                            ? `Remove ${semesterToDelete.yearKey.replace("year", "Year ")}?`
                                            : `Remove ${allSemesters[semesterToDelete.yearKey][semesterToDelete.semesterIndex].title}?`
                                    
                                    }
                                </h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    {semesterToDelete.action === 'clear'
                                        ? "All courses in this semester will be cleared."
                                        : semesterToDelete.isLastSemester
                                            ? "This will delete the entire year since it's the only semester."
                                            : "This semester and all its courses will be removed from your plan."
                                    }
                                </p>
                                
                                <div className="flex justify-end gap-4">
                                    <button
                                        className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setSemesterToDelete(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    
                                    <button
                                        className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                        onClick={() => {
                                            if (semesterToDelete.action === 'clear') {
                                                handleClearSemester(semesterToDelete.yearKey, semesterToDelete.semesterIndex);
                                            }
                                            else {
                                                handleRemoveSemester(semesterToDelete.yearKey, semesterToDelete.semesterIndex);
                                            }
                                        }}
                                    >
                                        {semesterToDelete.action === 'clear' ? 'Clear' : 'Remove'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Planner;