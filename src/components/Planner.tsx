import React, { useEffect, useMemo, useRef, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import Sidebar from "./Sidebar";
import SemesterBox from "./SemesterBox";
import { HelpCircle, PlusCircle, SquareAsterisk, Save, Check, Loader2, ChevronDown, Settings, Pencil, Plus, Copy, Trash2 } from "lucide-react";
import PlannerNavbar from "./PlannerNavbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Toaster, toast } from "sonner";
import { calculateCatalogYear, determineStudentType } from "@/utils/studentInfo";
import YearDivider from "./planner/YearDivider";
import { useUISnapshot } from "@/hooks/useUISnapshot";
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

const replaceSemesterCourses = (
    prev: any,
    yearKey: string,
    semesterIndex: number,
    courses: any[]
) => ({
    ...prev,
    [yearKey]: prev[yearKey].map((sem: any, i: number) =>
        i === semesterIndex ? { ...sem, courses } : sem
    ),
});

const moveCourse = (
    prev: any,
    sourceYear: string,
    sourceSemIdx: number,
    courseId: string,
    targetYear: string,
    targetSemIdx: number
) => {
    const sourceSemester = prev[sourceYear][sourceSemIdx];
    const courseIndex = sourceSemester.courses.findIndex((c: any) => c.id === courseId);
    if (courseIndex === -1) return prev;

    const course = sourceSemester.courses[courseIndex];
    const newSourceCourses = sourceSemester.courses.filter((_: any, i: number) => i !== courseIndex);

    if (sourceYear === targetYear) {
        // Both in same year — update that year's array in one pass
        const newYearSemesters = prev[sourceYear].map((sem: any, i: number) => {
            if (i === sourceSemIdx) return { ...sem, courses: newSourceCourses };
            if (i === targetSemIdx) return { ...sem, courses: [...sem.courses, course] };
            return sem;
        });
        return { ...prev, [sourceYear]: newYearSemesters };
    }

    const newSourceYear = prev[sourceYear].map((sem: any, i: number) =>
        i === sourceSemIdx ? { ...sem, courses: newSourceCourses } : sem
    );
    const newTargetYear = prev[targetYear].map((sem: any, i: number) =>
        i === targetSemIdx ? { ...sem, courses: [...sem.courses, course] } : sem
    );
    return { ...prev, [sourceYear]: newSourceYear, [targetYear]: newTargetYear };
};


const Planner: React.FC<PlannerProps> = ({ semesters, requirements, transcriptData, onRestartOnboarding }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    
    // student type 
    const studentType = determineStudentType(transcriptData);

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
                    element: '[data-tour="year-toggle"]',
                    popover: {
                        title: 'Year Collapse/Expand',
                        description: 'You can expand/collapse years at any time to focus on the years below.',
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
                                driverInstance.moveTo(15);
                                setTimeout(() => {
                                    driverInstance.destroy();
                                    driverInstance.drive(14);
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
                    element: '[data-tour="semester-toggle"]',
                    popover: {
                        title: 'Semester Collapse/Expand',
                        description: 'You can expand/collapse semesters at any time.',
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
                        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
                        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }
            ],
            onDestroyed: async () => {
                localStorage.setItem('hasSeenPlannerTutorial', 'true');
                dropdownWasOpenedRef.current = false;

                // CRUD Update
                if (user?.uid) {
                    const token = Cookies.get('authToken');
                    if (token) {
                        try {
                            const CRUD_API = import.meta.env.VITE_CRUD_API;
                            await fetch(CRUD_API, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    userId: user.uid,
                                    action: 'updateTutorialStatus',
                                    token,
                                    tutorialName: 'hasSeenPlannerTutorial',
                                    seenStatus: true
                                }),
                            });
                        } catch (error) {
                            console.error('Failed to update tutorial status in cloud:', error);
                        }
                    }
                }
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
        if (driverObj) driverObj.drive();
    };

    const [uiSnapshot, setUISnapshot] = useUISnapshot('sage-planner-ui', {
        collapsedYears: {} as Record<string, boolean>,
        collapsedSemesters: {} as Record<string, boolean>,
        sidebarCollapsed: false,
        expandedCategories: { "0": true, "1": true, "2": true } as Record<string, boolean>,
    });

    const { collapsedYears, collapsedSemesters, sidebarCollapsed, expandedCategories } = uiSnapshot;

    const [sidebarCollapsedDelayed, setSidebarCollapsedDelayed] = useState(false);

    useEffect(() => {
        if (sidebarCollapsed) {
            setTimeout(() => setSidebarCollapsedDelayed(true), 150);
        } else {
            setSidebarCollapsedDelayed(false);
        }
    }, [sidebarCollapsed]);

    const toggleSidebar = () =>
        setUISnapshot(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));

    const toggleYearCollapse = (yearKey: string) =>
        setUISnapshot(prev => ({
            ...prev,
            collapsedYears: { ...prev.collapsedYears, [yearKey]: !prev.collapsedYears[yearKey] }
        }));

    const toggleSemesterCollapse = (yearKey: string, semesterIndex: number) =>
        setUISnapshot(prev => ({
            ...prev,
            collapsedSemesters: {
                ...prev.collapsedSemesters,
                [`${yearKey}-${semesterIndex}`]: !prev.collapsedSemesters[`${yearKey}-${semesterIndex}`]
            }
        }));

    const toggleCategory = (index: number) =>
        setUISnapshot(prev => ({
            ...prev,
            expandedCategories: { ...prev.expandedCategories, [String(index)]: !prev.expandedCategories[String(index)] }
        }));

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
        if (plannerData.plans.length >= 5) {
            toast.error('Maximum of 5 plans allowed');
            return;
        }

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
        if (plannerData.plans.length >= 5) {
            toast.error('Maximum of 5 plans allowed');
            return;
        }

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
                    plannerData: plannerData,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save planner');
            }

            // Save to localStorage on successful cloud save
            try {
                localStorage.setItem('planner-state', JSON.stringify(plannerData));
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
            }
            setHasUnsavedChanges(false);
            toast.success('Saved your plan');
        } catch (error) {
            toast.error('Failed to save. Try again.');
        } finally {
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
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showPlanDeleteModal, setShowPlanDeleteModal] = useState(false);
    const [newPlanName, setNewPlanName] = useState("");

    const errorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (error && scrollContainerRef.current) {
            setTimeout(() => {
                scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }, 200);
        }
    }, [error]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024 && window.innerWidth >= 768) {
                setUISnapshot(prev => ({ ...prev, sidebarCollapsed: true }));
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const adaptedRequirements = useMemo(() => requirements, [requirements]);

    const allSuggestedCourses = useMemo(() => {
        const courses: any[] = [];

        const collectSuggestedCourses = (categories: any[], parentPath: string[] = []) => {
            if (!categories) return;
            categories.forEach((category) => {
                const currentPath = [...parentPath, category.name];
                if (category.suggested?.length > 0) {
                    courses.push(...category.suggested.map((course: any) => ({
                        ...course,
                        categoryPath: currentPath.join(' > ')
                    })));
                }
                if (category.categories?.length > 0) {
                    collectSuggestedCourses(category.categories, currentPath);
                }
            });
        };

        adaptedRequirements.forEach((req: any) => {
            if (req.categories) collectSuggestedCourses(req.categories, [req.degree]);
        });

        return courses;
    }, [adaptedRequirements]);

    const availableSemesters = useMemo(() => {
        const result: Array<{ yearKey: string; semesterIndex: number; title: string }> = [];
        Object.keys(allSemesters).forEach(yearKey => {
            allSemesters[yearKey].forEach((semester, idx) => {
                if (!semester.isFromTranscript) {
                    result.push({ yearKey, semesterIndex: idx, title: semester.title });
                }
            });
        });
        return result;
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
            const isRemoval =
                !course || !targetYear ||
                targetYear === '' ||
                targetSemesterIndex === undefined ||
                targetSemesterIndex === null ||
                targetSemesterIndex < 0;

            // --- REMOVAL ---
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

        let nextFallYear: number;

        if (Object.keys(allSemesters).length === 0) {
            nextFallYear = new Date().getFullYear();
        } else {
            const lastYearKey = Object.keys(allSemesters).sort().pop();
            if (lastYearKey) {
                const lastSemesters = allSemesters[lastYearKey];
                const lastSemester = lastSemesters[lastSemesters.length - 1];
                const lastYear = parseInt(lastSemester.title.split(' ')[1]);

                nextFallYear = lastSemester.title.includes('Fall') ? lastYear + 1 : lastYear;
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
        const courseCodesToRemove: string[] = [];
        allSemesters[yearKey].forEach((semester) => {
            if (!semester.isFromTranscript) {
                semester.courses?.forEach((course: any) => {
                    if (course.status === 'planned') {
                        const code = course.course_code || course.code;
                        if (code) courseCodesToRemove.push(code);
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
        const courseCodesToRemove: string[] = [];
        allSemesters[yearKey].forEach((semester) => {
            semester.courses?.forEach((course: any) => {
                if (course.status === 'planned') {
                    const code = course.course_code || course.code;
                    if (code) courseCodesToRemove.push(code);
                }
            });
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
    };

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
        const isLastSemester = allSemesters[yearKey].length === 1;
        setSemesterToDelete({ yearKey, semesterIndex, isLastSemester, action });
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
                onRestartOnboarding={onRestartOnboarding}
                availableSemesters={availableSemesters}
                onAddCourse={handleDropCourse}
            />
            <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] mt-[4rem] bg-gray-50 overflow-hidden p-6">
                {/* Save button */}
                <button 
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || isLoading}
                    className={`fixed bottom-4 right-24 px-6 py-3 rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 z-50 ${
                        hasUnsavedChanges
                            ? 'hover:-translate-y-0.5'
                            : 'cursor-default'
                    } text-white font-medium text-sm`}
                >
                    {hasUnsavedChanges && (
                        <div className="absolute -top-0 -right-3 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                    )}
                    {isLoading ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : hasUnsavedChanges ? (
                        <>
                            <Save size={20} />
                            <span>Save</span>
                        </>
                    ) : (
                        <>
                            <Check size={20} />
                            <span>Saved</span>
                        </>
                    )}
                </button>
                <button data-tour="help-button" onClick={startTutorial} className="fixed bottom-4 right-12 w-7 h-7 rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center z-50">
                    <HelpCircle size={18} className="text-white" />
                </button>

                <div className="h-[calc(100%-2rem)] pl-1 pr-6 py-6 pb-12 flex-col gap-4 hidden md:flex">
                    <Sidebar
                        requirements={adaptedRequirements}
                        expandedCategories={expandedCategories}
                        onToggleCategory={toggleCategory}
                        transcriptData={transcriptData}
                        onDropCourse={(courseId, sourceYear, sourceSemesterIndex) =>
                            handleDropCourse('', -1, null, sourceYear, sourceSemesterIndex, courseId, false)
                        }
                        isExpanded={!sidebarCollapsed}
                        onToggleExpanded={toggleSidebar}
                        placedSuggestedCourses={placedSuggestedCourses}
                        onRestartOnboarding={onRestartOnboarding}
                    />

                    <div
                        className={`${sidebarCollapsed ? "cursor-pointer rounded-md w-20" : "rounded-full w-80"} bg-gray-900 py-3 px-6 flex gap-2 justify-center items-center transition-all duration-300 absolute bottom-8`}
                        onClick={sidebarCollapsed ? toggleSidebar : undefined}
                        role={sidebarCollapsed ? "button" : undefined}
                        tabIndex={sidebarCollapsed ? 0 : undefined}
                        aria-label={sidebarCollapsed ? "Expand sidebar" : undefined}
                        onKeyDown={sidebarCollapsed ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleSidebar();
                          }
                        } : undefined}
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
                    {/* Plan Selector */}
                    <div className="mb-6 flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center gap-3 px-5 py-3 border-2 border-green-400 rounded-2xl text-base bg-white hover:bg-gray-50 shadow-sm font-medium">
                                <span>{activePlan?.name || 'Select Plan'}</span>
                                <ChevronDown size={18} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-bglight rounded-2xl">
                                {plannerData.plans.map(plan => (
                                    <DropdownMenuItem 
                                        key={plan.id}
                                        onClick={() => handleSwitchPlan(plan.id)}
                                        className="focus:bg-innercontainer cursor-pointer"
                                    >
                                        {plan.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors">
                                <Settings size={20} className="text-gray-600" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-white rounded-3xl shadow-lg p-3" align="end" side="right" sideOffset={10} alignOffset={-100}>
                                <DropdownMenuItem 
                                    onClick={handleNewPlan}
                                    className="text-[#3eb369] focus:text-[#3eb369] hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100 data-[highlighted]:text-[#3eb369]"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create new plan
                                </DropdownMenuItem>

                                <DropdownMenuItem 
                                    onClick={() => {
                                        setNewPlanName(activePlan?.name || '');
                                        setShowRenameModal(true);
                                    }}
                                    className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100"
                                >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Rename plan
                                </DropdownMenuItem>
                                
                                
                                <DropdownMenuItem 
                                    onClick={handleDuplicatePlan}
                                    className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Duplicate plan
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                    onClick={() => {
                                        if (plannerData.plans.length === 1) return;
                                        setShowPlanDeleteModal(true);
                                    }}
                                    disabled={plannerData.plans.length === 1}
                                    className="text-destructive focus:text-destructive hover:bg-gray-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete plan
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

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
                                <button onClick={() => setError(null)} aria-label="Dismiss error" className="ml-auto text-red-700 hover:text-red-900">×</button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-8">
                        {Object.keys(allSemesters).map((yearKey) => {
                            const isEntirelyUserCreated = allSemesters[yearKey].every(s => !s.isFromTranscript);
                            const hasUserCoursesToClear = allSemesters[yearKey].some(
                                s => !s.isFromTranscript && s.courses?.length > 0
                            );
                            const isYearCollapsed = !!collapsedYears[yearKey];
                            const totalCourses = allSemesters[yearKey].reduce(
                                (sum, sem) => sum + (sem.courses?.length ?? 0), 0
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
                                        isCollapsed={isYearCollapsed}
                                        onToggleCollapse={() => toggleYearCollapse(yearKey)}
                                        semesterCount={allSemesters[yearKey].length}
                                        courseCount={totalCourses}
                                    />

                                    {!isYearCollapsed && (
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
                                                    studentType={studentType}
                                                    catalogYear={calculateCatalogYear(semester.title)}
                                                    isCollapsed={!!collapsedSemesters[`${yearKey}-${idx}`]}
                                                    onToggleCollapse={() => toggleSemesterCollapse(yearKey, idx)}
                                                />
                                            ))}
                                        </div>
                                    )}
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

                    {/* Rename Plan Modal */}
                    {showRenameModal && (
                        <div 
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
                            onClick={() => setShowRenameModal(false)}
                        >
                            <div 
                                className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 className="font-semibold mb-3 text-lg">Rename Plan</h3>
                                <input
                                    type="text"
                                    value={newPlanName}
                                    onChange={(e) => setNewPlanName(e.target.value)}
                                    className="border px-3 py-2 rounded w-full mb-4"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleRenamePlan(newPlanName);
                                            setShowRenameModal(false);
                                        }
                                    }}
                                />
                                <div className="flex gap-2 justify-end">
                                    <button 
                                        onClick={() => setShowRenameModal(false)}
                                        className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => {
                                            handleRenamePlan(newPlanName);
                                            setShowRenameModal(false);
                                        }}
                                        className="px-4 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete Plan Modal */}
                    {showPlanDeleteModal && (
                        <div 
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
                            onClick={() => setShowPlanDeleteModal(false)}
                        >
                            <div 
                                className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 className="font-semibold mb-3 text-lg text-gray-800">
                                    Delete {activePlan?.name}?
                                </h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    This plan and all its courses will be permanently deleted. This action cannot be undone.
                                </p>
                                <div className="flex gap-2 justify-end">
                                    <button 
                                        onClick={() => setShowPlanDeleteModal(false)}
                                        className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => {
                                            handleDeletePlan();
                                            setShowPlanDeleteModal(false);
                                        }}
                                        className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
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
                                role="dialog"
                                aria-modal="true"
                                aria-label="Confirm action"
                                className="bg-white p-6 rounded-md shadow-lg w-full max-w-md"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                                    {semesterToDelete.action === 'clear'
                                        ? `Clear ${allSemesters[semesterToDelete.yearKey][semesterToDelete.semesterIndex!].title}?`
                                        : semesterToDelete.action === 'clearYear'
                                            ? `Clear all your courses in ${semesterToDelete.yearKey.replace("year", "Year ")}?`
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
                                            ? "All courses in your created semesters will be cleared."
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
                                        onClick={() => { setShowDeleteModal(false); setSemesterToDelete(null); }}
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