import React, { useEffect, useMemo, useRef, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import Sidebar from "./Sidebar";
import SemesterBox from "./SemesterBox";
import { HelpCircle, PlusCircle, SquareAsterisk, Save, Check, Loader2, RefreshCw } from "lucide-react";
import PlannerNavbar from "./PlannerNavbar";
import { Toaster, toast } from "sonner";
import { calculateCatalogYear, determineStudentType } from "@/utils/studentInfo";
import YearDivider from "./planner/YearDivider";
import { useAuth } from "@/context/AuthContext";
import Cookies from "js-cookie";
import { normalizeCourseCode } from "@/utils/prerequisiteUtils";
import { evaluatePlannerAndMergeSuggestions } from "@/utils/evaluatePlanner";

interface PlannerProps {
    semesters: {
        [key: string]: { title: string; courses: any[]; isFromTranscript?: boolean }[];
    };
    requirements: any;
    transcriptData: any;
    onRestartOnboarding?: () => void;
}

interface SavedPlannerState {
    id: string;
    name: string;
    semesters: {
        [key: string]: {
            title: string;
            courses: any[];
            isFromTranscript?: boolean;
            isLocked?: boolean;  
        }[];
    };
    placedCourses: string[];
    lastModified: number;
}

interface PlannerData {
    plans: SavedPlannerState[];
    activePlanId: string;
}

const Planner: React.FC<PlannerProps> = ({ semesters, requirements, transcriptData, onRestartOnboarding }) => {
    // main planner scroll ref
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    
    // student type 
    const studentType = determineStudentType(transcriptData);

    // Driver.js instance
    const [driverObj, setDriverObj] = useState<any>(null);
    const dropdownWasOpenedRef = useRef(false);

    useEffect(() => {        
        const driverInstance = driver({
            showProgress: true,
            showButtons: ['next', 'previous', 'close'],
            steps: [
                {
                    element: '[data-tour="sidebar"]',
                    popover: {
                        title: 'Sidebar',
                        description: 'This sidebar shows your degree requirements and suggested courses (when you expand the categories). Scroll down to see all categories',
                        side: "right"
                    }
                },
                {
                    element: '[data-tour="edit-plans"]',
                    popover: {
                        title: 'Edit Plans',
                        description: 'You can re-evaluate your degree plan at any time by either uploading a new transcript or by manually filling out your academic history.',
                        side: "right"
                    }
                },
                {
                    element: '[data-tour="sidebar-toggle"]',
                    popover: {
                        title: 'Expanding/Collapsing Sidebar',
                        description: 'To give you more room to work with your academic plan, you can collapse the sidebar. To see requirements again, click anywhere in the collapsed sidebar or press the sidebar button to expand',
                        side: "right"
                    }
                },
                {
                    element: '[data-tour="requirement-category-toggle"]',
                    popover: {
                        title: 'Expanding/Collapsing Categories',
                        description: 'SAGE automatically collapses completed categories and expands incomplete categories. You can collapse/expand categories at any time.',
                        side: "right"
                    }
                },
                {
                    element: '[data-tour="requirement-category-progress"]',
                    popover: {
                        title: 'Checking Progress',
                        description: 'This tracks total progress completed for a degree category (including subcategories)',
                        side: "right"
                    }
                },
                {
                    element: '[data-tour="semester-area"]',
                    popover: {
                        title: 'Academic Plan',
                        description: 'This is your academic plan. Drag courses here to build your schedule.',
                        side: "top"
                    }
                },
                {
                    element: '[data-tour="year-option"]',
                    popover: {
                        title: 'Year Options',
                        description: 'You can add a semester, clear all your custom semesters, or remove a year.',
                        side: "top"
                    },
                    onDeselected: () => {
                        if (!dropdownWasOpenedRef.current) {
                            setTimeout(() => {
                                driverInstance.moveTo(13);
                                setTimeout(() => {
                                    driverInstance.destroy();
                                    driverInstance.drive(12);
                                }, 50);
                            }, 150);
                        }
                    }
                },
                {
                    element: '[data-tour="add-semester"]',
                    popover: {
                        title: 'Add Semester',
                        description: 'Add a semester to this academic year. You can have up to three semesters per year: Fall, Spring, and Summer.',
                        side: "bottom"
                    }
                },
                {
                    element: '[data-tour="transcript-semester"]',
                    popover: {
                        title: 'Completed Semester',
                        description: 'These boxes represent a completed semester and aren\'t editable.',
                        side: "top"
                    }
                },
                {
                    element: '[data-tour="user-semester"]',
                    popover: {
                        title: 'Your Semester',
                        description: 'These boxes allow you to drag your courses here',
                        side: "top"
                    }
                },
                {
                    element: '[data-tour="semester-lock"]',
                    popover: {
                        title: 'Semester Lock/Unlock',
                        description: 'Lock/unlock courses in this semester to prevent/allow changes to them.',
                        side: "left"
                    }
                },
                {
                    element: '[data-tour="semester-options"]',
                    popover: {
                        title: 'Semester Options',
                        description: 'You can clear courses or remove the semester entirely.',
                        side: "left"
                    }
                },
                {
                    element: '[data-tour="add-year"]',
                    popover: {
                        title: 'Add Year',
                        description: 'Create a new academic year to start future planning.',
                        side: "left"
                    },
                    onDeselected: () => {
                        scrollContainerRef.current?.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                        });
                    }
                },
                {
                    element: '[data-tour="help-button"]',
                    popover: {
                        title: 'Tutorial',
                        description: 'Click here to replay the tutorial at any time',
                        side: "left"
                    },
                    onDeselected: () => {
                        scrollContainerRef.current?.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                        });
                    }
                }
            ],
            onDestroyed: () => {
                localStorage.setItem('hasSeenPlannerTutorial', 'true');
                dropdownWasOpenedRef.current = false;
            },
            popoverClass: 'sage-driver-theme'
        });
        
        setDriverObj(driverInstance);
        
        const hasSeenTutorial = localStorage.getItem('hasSeenPlannerTutorial');
        if (!hasSeenTutorial) {
            setTimeout(() => driverInstance.drive(), 500);
        }
    }, []);

    const startTutorial = () => {
        if (driverObj) {
            driverObj.drive();
        }
    };
    
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
                    originalLocation: { yearKey, semesterIndex: semIdx }
                }))
            }));
        });
        return updatedSemesters;
    }, [semesters]);

    const [plannerData, setPlannerData] = useState<PlannerData>(() => {
        const stored = localStorage.getItem('planner-state');

        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (error) {
                console.error('Failed to parse localStorage:', error);
            }
        }
        
        const defaultPlanId = crypto.randomUUID();
        return {
            plans: [{
                id: defaultPlanId,
                name: 'Plan 1',
                semesters: initialPlannerState,
                placedCourses: [],
                lastModified: Date.now()
            }],
            activePlanId: defaultPlanId
        };
    });

    const activePlan = plannerData.plans.find(p => p.id === plannerData.activePlanId)!;
    const allSemesters = activePlan.semesters;
    const placedSuggestedCourses = new Set(activePlan.placedCourses);

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const updatePlannerState = (updates: Partial<SavedPlannerState>) => {
        setPlannerData(prev => ({
            ...prev,
            plans: prev.plans.map(p =>
                p.id === prev.activePlanId
                    ? { ...p, ...updates, lastModified: Date.now()}
                    : p
            )
        }));
        setHasUnsavedChanges(true);
    };

    // Plan management functions
    const handleSwitchPlan = (planId: string) => {
        setPlannerData(prev => ({
            ...prev,
            activePlanId: planId
        }));
        setHasUnsavedChanges(true);
    };

    const handleNewPlan = () => {
        const newPlanId = crypto.randomUUID();
        const planNumber = plannerData.plans.length + 1;
        
        setPlannerData(prev => ({
            plans: [
                ...prev.plans,
                {
                    id: newPlanId,
                    name: `Plan ${planNumber}`,
                    semesters: initialPlannerState,
                    placedCourses: [],
                    lastModified: Date.now()
                }
            ],
            activePlanId: newPlanId
        }));
        setHasUnsavedChanges(true);
        toast.success('Created new plan');
    };

    const handleDuplicatePlan = () => {
        const currentPlan = plannerData.plans.find(p => p.id === plannerData.activePlanId);
        if (!currentPlan) return;

        const newPlanId = crypto.randomUUID();
        const duplicatedPlan: SavedPlannerState = {
            ...JSON.parse(JSON.stringify(currentPlan)), // Deep copy
            id: newPlanId,
            name: `${currentPlan.name} (Copy)`,
            lastModified: Date.now()
        };

        setPlannerData(prev => ({
            plans: [...prev.plans, duplicatedPlan],
            activePlanId: newPlanId
        }));
        setHasUnsavedChanges(true);
        toast.success('Duplicated plan');
    };

    const handleDeletePlan = () => {
        if (plannerData.plans.length === 1) {
            toast.error('Cannot delete the last plan');
            return;
        }

        const currentIndex = plannerData.plans.findIndex(p => p.id === plannerData.activePlanId);
        const newActivePlanId = currentIndex > 0 
            ? plannerData.plans[currentIndex - 1].id 
            : plannerData.plans[1].id;

        setPlannerData(prev => ({
            plans: prev.plans.filter(p => p.id !== prev.activePlanId),
            activePlanId: newActivePlanId
        }));
        setHasUnsavedChanges(true);
        toast.success('Deleted plan');
    };

    const handleRenamePlan = (newName: string) => {
        if (!newName.trim()) {
            toast.error('Plan name cannot be empty');
            return;
        }

        setPlannerData(prev => ({
            ...prev,
            plans: prev.plans.map(p =>
                p.id === prev.activePlanId
                    ? { ...p, name: newName.trim(), lastModified: Date.now() }
                    : p
            )
        }));
        setHasUnsavedChanges(true);
        toast.success('Renamed plan');
    };

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
                    plannerState: plannerData,
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
                localStorage.setItem('planner-state', JSON.stringify(plannerData));
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
        semesterIndex?: number;
        isLastSemester?: boolean;
        action: 'clear' | 'delete' | 'clearYear' | 'deleteYear';
    } | null>(null);
    const [isRunningQuickEvaluation, setIsRunningQuickEvaluation] = useState(false);
    const [lastQuickEvalPlannedCoursesSignature, setLastQuickEvalPlannedCoursesSignature] =
        useState<string | null>(null);

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

    const allSuggestedCourses = useMemo(() => {
        const courses: any[] = [];
        
        const collectSuggestedCourses = (categories: any[], parentPath: string[] = []) => {
            if (!categories) return;
            
            categories.forEach((category) => {
                const currentPath = [...parentPath, category.name];
                
                if (category.suggested && category.suggested.length > 0) {
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

    const allCompletedCourseCodes = useMemo(() => {
        const completedCodes = new Set<string>();

        const collectCompletedCourseCodes = (categories: any[]) => {
            if (!Array.isArray(categories)) return;

            categories.forEach((category) => {
                if (Array.isArray(category.classes)) {
                    category.classes.forEach((course: any) => {
                        const status = String(course.status || "").toLowerCase();
                        const code = normalizeCourseCode(course.code || course.course_code);

                        if (!code) return;
                        if (!status || status === "completed") {
                            completedCodes.add(code);
                        }
                    });
                }

                if (Array.isArray(category.categories) && category.categories.length > 0) {
                    collectCompletedCourseCodes(category.categories);
                }
            });
        };

        adaptedRequirements.forEach((requirement: any) => {
            collectCompletedCourseCodes(requirement.categories || []);
        });

        return Array.from(completedCodes);
    }, [adaptedRequirements]);

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

    const semesterOrderByKey = useMemo(() => {
        const map: Record<string, number> = {};
        let semesterOrder = 0;

        Object.keys(allSemesters).forEach((yearKey) => {
            allSemesters[yearKey].forEach((_, semesterIndex) => {
                map[`${yearKey}-${semesterIndex}`] = semesterOrder;
                semesterOrder += 1;
            });
        });

        return map;
    }, [allSemesters]);

    const allPlannedCoursesWithOrder = useMemo(() => {
        const courses: Array<{
            code: string;
            yearKey: string;
            semesterIndex: number;
            semesterOrder: number;
            semesterTitle: string;
        }> = [];

        Object.keys(allSemesters).forEach((yearKey) => {
            allSemesters[yearKey].forEach((semester, semesterIndex) => {
                const semesterOrder = semesterOrderByKey[`${yearKey}-${semesterIndex}`];
                semester.courses?.forEach((course: any) => {
                    const code = normalizeCourseCode(course.course_code || course.code);
                    if (!code) return;

                    courses.push({
                        code,
                        yearKey,
                        semesterIndex,
                        semesterOrder,
                        semesterTitle: semester.title,
                    });
                });
            });
        });

        return courses;
    }, [allSemesters, semesterOrderByKey]);

    const allPlannedCourseCodes = useMemo(() => {
        return allPlannedCoursesWithOrder.map((course) => course.code);
    }, [allPlannedCoursesWithOrder]);

    const plannedCoursesSignature = useMemo(() => {
        const plannedCoursePlacements: string[] = [];

        Object.keys(allSemesters)
            .sort()
            .forEach((yearKey) => {
                allSemesters[yearKey].forEach((semester, semesterIndex) => {
                    semester.courses?.forEach((course: any) => {
                        const status = String(course.status || "").toLowerCase();
                        if (status !== "planned") return;

                        const code = normalizeCourseCode(course.course_code || course.code);
                        if (!code) return;

                        plannedCoursePlacements.push(`${code}`);
                    });
                });
            });

        plannedCoursePlacements.sort();
        return plannedCoursePlacements.join("|");
    }, [allSemesters]);

    const runQuickEvaluation = async () => {
        if (!plannedCoursesSignature) {
            toast.info("Plan more courses from the sidebar to suggest more classes.");
            return;
        }

        if (plannedCoursesSignature === lastQuickEvalPlannedCoursesSignature) {
            toast.info("Plan more courses from the sidebar to suggest more classes.");
            return;
        }

        setIsRunningQuickEvaluation(true);
        try {
            // Persist planner state before quick evaluation refreshes suggestions.
            localStorage.setItem('planner-state', JSON.stringify(plannerData));

            await evaluatePlannerAndMergeSuggestions({
                quickEvaluation: true,
                assumeMinimumGradePass: true,
                plannerStateOverride: plannerData,
            });
            toast.success("Suggested courses refreshed");
            setLastQuickEvalPlannedCoursesSignature(plannedCoursesSignature);
        } catch (error) {
            console.error("Quick evaluation failed:", error);
            toast.error("Could not save planner state or refresh suggested courses");
        } finally {
            setIsRunningQuickEvaluation(false);
        }
    };

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

            if (isSuggested) {
                const targetSemester = newState[targetYear][targetSemesterIndex];
                if (targetSemester && Array.isArray(targetSemester.courses)) {
                    const newCourseId = `${targetYear}-${targetSemester.title}-${course.course_code}-${targetSemester.courses.length}-${Date.now()}`;

                    const newCourse = {
                        course_code: course.code || course.course_code,
                        course_name: course.name || course.course_name || `${course.code || course.course_code} Course`,
                        credits_planned: course.credits || 3,
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

            if (sourceYear && sourceSemesterIndex !== undefined) {
                const sourceSemester = newState[sourceYear][sourceSemesterIndex];
                if (sourceSemester && Array.isArray(sourceSemester.courses)) {
                    const courseIndex = sourceSemester.courses.findIndex(
                        (c: any) => c.id === courseId
                    );

                    if (courseIndex !== -1) {
                        const [removedCourse] = sourceSemester.courses.splice(courseIndex, 1);
                        console.log("Successfully removed course:", removedCourse);

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

    const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({
        0: true,
        1: true,
        2: true,
    });

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

        let nextFallYear;

        if (Object.keys(allSemesters).length === 0) {
            nextFallYear = new Date().getFullYear();
        } else {
            const lastYearKey = Object.keys(allSemesters).sort().pop();
            if (lastYearKey) {
                const lastSemesters = allSemesters[lastYearKey];
                const lastSemester = lastSemesters[lastSemesters.length - 1];
                const lastYear = parseInt(lastSemester.title.split(' ')[1]);

                if (lastSemester.title.includes('Summer')) {
                    nextFallYear = lastYear;
                } else if (lastSemester.title.includes('Spring')) {
                    nextFallYear = lastYear;
                } else {
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

    const handleClearYear = (yearKey: string) => {
        setSemesterToDelete({ yearKey, action: 'clearYear' });
        setShowDeleteModal(true);
    };
    
    const handleDeleteYear = (yearKey: string) => {
        setSemesterToDelete({ yearKey, action: 'deleteYear' });
        setShowDeleteModal(true);
    };

    const executeClearYear = (yearKey: string) => {
        const yearSemesters = allSemesters[yearKey];
        const courseCodesToRemove: string[] = [];
        
        yearSemesters.forEach((semester) => {
            if (!semester.isFromTranscript && semester.courses) {
                semester.courses.forEach((course: any) => {
                    if (course.status === 'planned') {
                        const courseCode = course.course_code || course.code;
                        if (courseCode) {
                            courseCodesToRemove.push(courseCode);
                        }
                    }
                });
            }
        });

        const newState = JSON.parse(JSON.stringify(allSemesters));
        newState[yearKey].forEach((semester: any) => {
            if (!semester.isFromTranscript) {
                semester.courses = [];
            }
        });

        if (courseCodesToRemove.length > 0) {
            const newPlaced = new Set(placedSuggestedCourses);
            courseCodesToRemove.forEach(code => newPlaced.delete(code));
            updatePlannerState({
                semesters: newState,
                placedCourses: Array.from(newPlaced)
            });
        } else {
            updatePlannerState({ semesters: newState });
        }
        
        setShowDeleteModal(false);
        setSemesterToDelete(null);
    };
    
    const executeDeleteYear = (yearKey: string) => {
        const yearSemesters = allSemesters[yearKey];
        const courseCodesToRemove: string[] = [];
        
        yearSemesters.forEach((semester) => {
            if (semester.courses) {
                semester.courses.forEach((course: any) => {
                    if (course.status === 'planned') {
                        const courseCode = course.course_code || course.code;
                        if (courseCode) {
                            courseCodesToRemove.push(courseCode);
                        }
                    }
                });
            }
        });
        
        const newState = { ...allSemesters };
        delete newState[yearKey];
        
        if (courseCodesToRemove.length > 0) {
            const newPlaced = new Set(placedSuggestedCourses);
            courseCodesToRemove.forEach(code => newPlaced.delete(code));
            updatePlannerState({
                semesters: newState,
                placedCourses: Array.from(newPlaced)
            });
        } else {
            updatePlannerState({ semesters: newState });
        }
            
            setShowDeleteModal(false);
            setSemesterToDelete(null);
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
       
        setShowDeleteModal(false);
        setSemesterToDelete(null);
    }

    const handleRemoveSemester = (yearKey: string, semesterIndex: number) => {
        if (!semesterToDelete) return;
        
        const semesterToRemove = allSemesters[yearKey]?.[semesterIndex];
        if (semesterToRemove?.courses) {
            const courseCodesToRemove: string[] = [];
            semesterToRemove.courses.forEach((course: any) => {
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
        
        setShowDeleteModal(false);
        setSemesterToDelete(null);
    };

    const openClearDeleteModal = (yearKey: string, semesterIndex: number, action: 'clear' | 'delete') => {
        const yearSemesters = allSemesters[yearKey];
        const isLastSemester = yearSemesters.length === 1;
        
        setSemesterToDelete({ yearKey, semesterIndex, isLastSemester, action});
        setShowDeleteModal(true);
    };

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
                allCompletedCourseCodes={allCompletedCourseCodes}
                allPlannedCoursesWithOrder={allPlannedCoursesWithOrder}
                onRestartOnboarding={onRestartOnboarding}
                availableSemesters={availableSemesters}
                onAddCourse={handleDropCourse}
                plans={plannerData.plans.map(p => ({ id: p.id, name: p.name }))}
                activePlanId={plannerData.activePlanId}
                onSwitchPlan={handleSwitchPlan}
                onNewPlan={handleNewPlan}
                onDuplicatePlan={handleDuplicatePlan}
                onDeletePlan={handleDeletePlan}
                onRenamePlan={handleRenamePlan}
            />
            <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] mt-[4rem] bg-gray-50 overflow-hidden p-6">
                {/* Action buttons */}
                <div className="fixed bottom-4 right-24 flex items-center gap-2 z-50">
                    <button
                        onClick={runQuickEvaluation}
                        disabled={isRunningQuickEvaluation || isLoading}
                        className={`px-4 py-2 rounded-full bg-white border border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-gray-700 font-medium text-sm ${
                            isRunningQuickEvaluation || isLoading
                                ? 'cursor-not-allowed opacity-70'
                                : 'hover:-translate-y-0.5'
                        }`}
                        title="Run quick evaluation and refresh suggested courses"
                    >
                        {isRunningQuickEvaluation ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <RefreshCw size={16} />
                        )}
                        <span>{isRunningQuickEvaluation ? "Running..." : "Suggest More Classes"}</span>
                    </button>

                    <button 
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges || isLoading}
                        className={`px-4 py-2 rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 ${
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
                </div>
                <button data-tour="help-button" onClick={startTutorial} className="fixed bottom-4 right-12 w-7 h-7 rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center z-50">
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
                        allCompletedCourseCodes={allCompletedCourseCodes}
                        allPlannedCoursesWithOrder={allPlannedCoursesWithOrder}
                        onRestartOnboarding={onRestartOnboarding}
                    />
                    
                    <div 
                        className={`${sidebarCollapsed ? "cursor-pointer rounded-md w-20" : "rounded-full w-80"} bg-gray-900 py-3 px-6 flex gap-2 justify-center items-center transition-all duration-300 absolute bottom-8`}
                        onClick={sidebarCollapsed ? () => setSidebarCollapsed(false) : undefined}
                    >
                        <SquareAsterisk size={32} className="stroke-green-400 flex-shrink-0" />
                        <small className={`${sidebarCollapsedDelayed ? "hidden" : "block"} text-textlight text-xs`}>
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

                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 scrollbar-hide" style={{ scrollBehavior: 'smooth' }}>
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
                                    ×
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-8">
                        {Object.keys(allSemesters).map((yearKey) => {
                            const isEntirelyUserCreated = allSemesters[yearKey].every(
                                semester => !semester.isFromTranscript
                            );

                            const hasUserCoursesToClear = allSemesters[yearKey].some(
                                semester => !semester.isFromTranscript && semester.courses && semester.courses.length > 0
                            );

                            return (
                                <div key={yearKey}>
                                    <YearDivider 
                                        yearLabel={yearKey.replace("year", "Year ")}
                                        yearKey={yearKey}
                                        isEntirelyUserCreated={isEntirelyUserCreated}
                                        hasUserCoursesToClear={hasUserCoursesToClear}
                                        onAddSemester={handleAddSemester}
                                        onClearYear={handleClearYear}
                                        onDeleteYear={handleDeleteYear}
                                        driverObj={driverObj}
                                        dropdownWasOpenedRef={dropdownWasOpenedRef}
                                    />
                                    <div className="flex justify-between items-center mb-4">
                                        <div />
                                    </div>

                                    <div className="flex flex-wrap gap-4 justify-start" data-tour="semester-area">
                                        {allSemesters[yearKey].map((semester, idx) => (
                                            <SemesterBox
                                                key={idx}
                                                {...semester}
                                                data-tour={!semester.isFromTranscript && !document.querySelector('[data-tour="user-semester"]') ? "user-semester" : "transcript-semester"}
                                                yearKey={yearKey}
                                                semesterIndex={idx}
                                                isFromTranscript={semester.isFromTranscript || false}
                                                isEmpty={semester.isFromTranscript && semester.courses.length === 0}
                                                onDropCourse={(course, sourceYear, sourceSemesterIndex, courseId, isSuggested) =>
                                                    handleDropCourse(yearKey, idx, course, sourceYear, sourceSemesterIndex, courseId, isSuggested)
                                                }
                                                onClearSemester={() => openClearDeleteModal(yearKey, idx, 'clear')}
                                                onRemoveSemester={() => openClearDeleteModal(yearKey, idx, 'delete')}
                                                onShowError={setError}
                                                allSuggestedCourses={allSuggestedCourses}
                                                allCompletedCourseCodes={allCompletedCourseCodes}
                                                allPlannedCourseCodes={allPlannedCourseCodes}
                                                allPlannedCoursesWithOrder={allPlannedCoursesWithOrder}
                                                currentSemesterOrder={semesterOrderByKey[`${yearKey}-${idx}`]}
                                                studentType={studentType}
                                                catalogYear={calculateCatalogYear(semester.title)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {Object.keys(allSemesters).length > 0 && (
                        <div className="mt-8 mb-16 flex justify-end">
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
                                        ? `Clear ${allSemesters[semesterToDelete.yearKey][semesterToDelete.semesterIndex!].title}?`
                                        : semesterToDelete.action === 'clearYear'
                                            ? `Clear all user courses in ${semesterToDelete.yearKey.replace("year", "Year ")}?`
                                            : semesterToDelete.action === 'deleteYear'
                                                ? `Delete ${semesterToDelete.yearKey.replace("year", "Year ")}?`
                                                : semesterToDelete.isLastSemester 
                                                    ? `Remove ${semesterToDelete.yearKey.replace("year", "Year ")}?`
                                                    : `Remove ${allSemesters[semesterToDelete.yearKey][semesterToDelete.semesterIndex!].title}?`
                                    }
                                </h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    {semesterToDelete.action === 'clear'
                                        ? "All courses in this semester will be cleared."
                                        : semesterToDelete.action === 'clearYear'
                                            ? "All courses in user-created semesters will be cleared. Transcript semesters will remain untouched."
                                            : semesterToDelete.action === 'deleteYear'
                                                ? "This entire year and all its semesters will be permanently removed."
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
                                                handleClearSemester(semesterToDelete.yearKey, semesterToDelete.semesterIndex!);
                                            } else if (semesterToDelete.action === 'clearYear') {
                                                executeClearYear(semesterToDelete.yearKey);
                                            } else if (semesterToDelete.action === 'deleteYear') {
                                                executeDeleteYear(semesterToDelete.yearKey);
                                            } else {
                                                handleRemoveSemester(semesterToDelete.yearKey, semesterToDelete.semesterIndex!);
                                            }
                                        }}
                                    >
                                        {semesterToDelete.action === 'clear' || semesterToDelete.action === 'clearYear' 
                                            ? 'Clear' 
                                            : 'Delete'}
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
