import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "@/components/planner/Sidebar";
import SemesterBox from "@/components/planner/SemesterBox";
import { HelpCircle, PlusCircle, SquareAsterisk, Save, Check, Loader2, RefreshCw, ChevronDown, Settings, Pencil, Plus, Copy, Trash2, Download } from "lucide-react";
import PlannerNavbar from "./PlannerNavbar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Toaster, toast } from "sonner";
import { calculateCatalogYear, calculateLatestYear, determineStudentType, isCurrentSemester } from "@/utils/studentInfo";
import YearDivider from "@/components/planner/YearDivider";
import { useUISnapshot } from "@/hooks/useUISnapshot";
import { useAuth } from "@/context/AuthContext";
import { normalizeCourseCode } from "@/utils/prerequisiteUtils";
import { evaluatePlannerAndMergeSuggestions } from "@/utils/evaluatePlanner";
import { usePlannerStore } from "@/stores/plannerStore";
import { usePlannerTutorial } from "@/hooks/usePlannerTutorial";
import { exportPlanAsCSV, exportPlanAsJPG, exportPlanAsPDF, exportPlanAsPNG } from "@/utils/planExport";
import CourseDiscoveryModal, { CartItem } from "@/components/planner/CourseDiscoveryModal";

interface PlannerProps {
    semesters: {
        [key: string]: { title: string; courses: any[]; isFromTranscript?: boolean }[];
    };
    requirements: any;
    transcriptData: any;
    onRestartOnboarding?: () => void;
    onRegisterConflictHandler?: (
        cb: (choice: "overwrite" | "select" | "new", degrees: any[], fetchedData: any, targetPlanId?: string) => void,
        plans: { id: string; name: string }[]
    ) => void;
    onSidebarToggle?: (collapsed: boolean) => void;
}


const Planner: React.FC<PlannerProps> = ({ semesters, requirements, transcriptData, onRestartOnboarding, onRegisterConflictHandler, onSidebarToggle }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { user, allowedYears, hasSeenPlannerTutorial } = useAuth();
    const hasAutoSaved = useRef(false);
    const lastSavedState = usePlannerStore(state => state.lastSavedState);

    // student type 
    const studentType = determineStudentType(transcriptData);

    // profile -> sidebar link
    const location = useLocation();
    const focusLabel = location.state?.focusLabel as string | undefined;

    // keyboard shortcuts 
    const undo = usePlannerStore(state => state.undo);
    const redo = usePlannerStore(state => state.redo);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().includes('MAC');
            const ctrl = isMac ? e.metaKey : e.ctrlKey;
            if (!ctrl) return;

            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
                toast.info('Undone');
            }
            if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                e.preventDefault();
                redo();
                toast.info('Redone');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    const { driverObj, startTutorial, dropdownWasOpenedRef } = usePlannerTutorial({ scrollContainerRef, user, hasSeenTutorial: hasSeenPlannerTutorial, onForceExpandSidebar: () => { if (sidebarCollapsed) toggleSidebar(); } });

    const [uiSnapshot, setUISnapshot] = useUISnapshot('sage-planner-ui', {
        collapsedYears: {} as Record<string, boolean>,
        collapsedSemesters: {} as Record<string, boolean>,
        sidebarCollapsed: false,
        expandedCategories: { "0": true, "1": true, "2": true } as Record<string, boolean>,
    });

    const { collapsedYears, collapsedSemesters, sidebarCollapsed, expandedCategories } = uiSnapshot;

    const [sidebarCollapsedDelayed, setSidebarCollapsedDelayed] = useState(false);

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
                isFromTranscript: true,
                isLocked: false,
                courses: semester.courses.map(course => ({
                    ...course,
                    originalLocation: { yearKey, semesterIndex: semIdx }
                }))
            }));
        });
        return updatedSemesters;
    }, [semesters]);

    // Zustand store selectors
    const plans = usePlannerStore(state => state.plans);
    const activePlanId = usePlannerStore(state => state.activePlanId);
    const switchPlan = usePlannerStore(state => state.switchPlan);
    const createNewPlan = usePlannerStore(state => state.createNewPlan);
    const duplicatePlan = usePlannerStore(state => state.duplicatePlan);
    const deletePlan = usePlannerStore(state => state.deletePlan);
    const renamePlan = usePlannerStore(state => state.renamePlan);
    const updateActivePlan = usePlannerStore(state => state.updateActivePlan);

    // Semester management selectors
    const addYearAction = usePlannerStore(state => state.addYear);
    const clearYearAction = usePlannerStore(state => state.clearYear);
    const deleteYearAction = usePlannerStore(state => state.deleteYear);
    const addSemesterAction = usePlannerStore(state => state.addSemester);
    const clearSemesterAction = usePlannerStore(state => state.clearSemester);
    const removeSemesterAction = usePlannerStore(state => state.removeSemester);
    const dropCourseAction = usePlannerStore(state => state.dropCourse);

    // idempotent init guard to prevent double making of plans
    const planInitializedRef = useRef(false);

    useEffect(() => {
        if (plans.length === 0 && !planInitializedRef.current) {
            planInitializedRef.current = true;
            const evalRaw = localStorage.getItem('evaluation');
            const evaluation = evalRaw ? JSON.parse(evalRaw) : null;
            createNewPlan(initialPlannerState, evaluation);
        }
    }, [plans.length, initialPlannerState, createNewPlan]);

    useEffect(() => {
        if (plans.length === 0) return;
        try {
            localStorage.setItem('planner-state', JSON.stringify({ plans, activePlanId }));
        } catch (e) {
            console.warn('localStorage sync failed:', e);
        }
    }, [plans, activePlanId]);

    const { dropCourse } = usePlannerStore();
    const activePlan = plans.find(p => p.id === activePlanId);
    const allSemesters = activePlan?.semesters || {};
    const placedSuggestedCourses = new Set(activePlan?.placedCourses || []);

    // Unsaved changes tracking
    const hasUnsavedChanges = usePlannerStore(state => state.getHasUnsavedChanges());
    const markAsSaved = usePlannerStore(state => state.markAsSaved);

    const [pendingConflictChoice, setPendingConflictChoice] = useState<{
        choice: "overwrite" | "select" | "new";
        degrees: any[];
        fetchedData: any;
        targetPlanId?: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Plan management functions
    const handleSwitchPlan = (planId: string) => {
        switchPlan(planId);
    };

    const educationLevel = useMemo(() => {
        const hasGradCredits = 
            transcriptData?.credit_hours?.graduate || 
            transcriptData?.gpa?.graduate;
        return hasGradCredits ? 'graduate' : 'undergraduate';
    }, [transcriptData]);

    const handleNewPlan = () => {
        const evalRaw = localStorage.getItem('evaluation');
        const evaluation = evalRaw ? JSON.parse(evalRaw) : null;
        createNewPlan(initialPlannerState, evaluation);
    };

    const handleDuplicatePlan = () => {
        duplicatePlan();
    };

    const handleDeletePlan = () => {
        deletePlan();
    };

    const handleRenamePlan = (newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        renamePlan(trimmed);
    };

    const savePlannerState = async () => {
        if (!user) throw new Error("Not authenticated");
        const token = await user.getIdToken();

        const { plans, activePlanId } = usePlannerStore.getState();
        const currentPlannerData = { plans, activePlanId };

        const CRUD_API = import.meta.env.VITE_CRUD_API;
        const response = await fetch(CRUD_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.uid,
                action: 'savePlanner',
                token,
                plannerData: currentPlannerData,
                transcriptData: transcriptData
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to save planner');
        }

        try {
            localStorage.setItem('planner-state', JSON.stringify(currentPlannerData));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }

        markAsSaved();
    };

    useEffect(() => {
        if (
            plans.length === 1 &&
            !hasAutoSaved.current &&
            lastSavedState === null &&
            user
        ) {
            hasAutoSaved.current = true;
            savePlannerState().catch(e => console.error('Auto-save failed!', e));
        }
    }, [plans.length, lastSavedState, user]);

    const handleSave = async () => {
        if (!user) {
            toast.error('You must be logged in to save');
            return;
        }

        const token = await user.getIdToken();
        if (!token) {
            toast.error('Authentication token not found');
            return;
        }

        setIsLoading(true);
        try {
            await savePlannerState();
            toast.success('Saved your plan');
        } catch (error) {
            toast.error('Failed to save. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // conflicts for reupload 
    useEffect(() => {
        if (!pendingConflictChoice) return;
        const { choice, targetPlanId } = pendingConflictChoice;

        if (choice === "overwrite") {
            updateActivePlan({
                semesters: initialPlannerState,
                placedCourses: [],
                lastModified: Date.now(),
                evaluation: pendingConflictChoice.fetchedData
            });
            markAsSaved();
            toast.success("Current plan updated with new transcript");

        } else if (choice === "select") {
            const planToUpdate = targetPlanId ?? activePlanId;
            if (planToUpdate !== activePlanId) {
                switchPlan(planToUpdate);
            }
            updateActivePlan({
                semesters: initialPlannerState,
                placedCourses: [],
                lastModified: Date.now(),
                evaluation: pendingConflictChoice.fetchedData
            });
            markAsSaved();
            toast.success("Plan updated with new transcript");

        } else if (choice === "new") {
            if (plans.length >= 5) {
                toast.error("Maximum of 5 plans reached — delete one first");
                setPendingConflictChoice(null);
                return;
            }
            const newPlanName = `Plan ${plans.length + 1} (New Transcript)`;
            createNewPlan(initialPlannerState, pendingConflictChoice.fetchedData, newPlanName);
            toast.success("New plan created with new transcript");
        }

        setPendingConflictChoice(null);
    }, [pendingConflictChoice, activePlanId, plans.length, switchPlan, updateActivePlan, createNewPlan]);

    useEffect(() => {
        onRegisterConflictHandler?.(
            (choice, degrees, fetchedData, targetPlanId) => {
                setPendingConflictChoice({ choice, degrees, fetchedData, targetPlanId });
            },
            plans.map(p => ({ id: p.id, name: p.name }))
        );
    }, [plans, onRegisterConflictHandler]);

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

    const [coursebookData, setCoursebookData] = useState<Record<string, any[]>>({});
    const [coursebookSemester, setCoursebookSemester] = useState<string | null>(null);
    const [gradesData, setGradesData] = useState<Record<string, any>>({});
    const [error, setError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    // when we want "educational" worthy students to use SAGE
    const [showExtendYearsModal, setShowExtendYearsModal] = useState(false);
    const [requestedYears, setRequestedYears] = useState(12);
    const [extendRequestSent, setExtendRequestSent] = useState(false);

    const [semesterToDelete, setSemesterToDelete] = useState<{
        yearKey: string;
        semesterIndex?: number;
        isLastSemester?: boolean;
        action: 'clear' | 'delete' | 'clearYear' | 'deleteYear';
    } | null>(null);
    const [isRunningQuickEvaluation, setIsRunningQuickEvaluation] = useState(false);
    const [lastQuickEvalPlannedCoursesSignature, setLastQuickEvalPlannedCoursesSignature] =
        useState<string | null>(null);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showPlanDeleteModal, setShowPlanDeleteModal] = useState(false);
    const [newPlanName, setNewPlanName] = useState("");
    const [showDiscovery, setShowDiscovery] = useState(false);
    const gradesFetchedRef = useRef<Set<string>>(new Set());
    const coursebookFetchedRef = useRef<Set<string>>(new Set());
    const errorRef = useRef<HTMLDivElement>(null);
    const [discoveryCart, setDiscoveryCart] = useState<CartItem[]>([]);
    const [authToken, setAuthToken] = useState<string>('');

    useEffect(() => {
        user?.getIdToken().then(setAuthToken);
    }, [user]);

    useEffect(() => {
        if (error && scrollContainerRef.current) {
            setTimeout(() => {
                scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }, 200);
        }
    }, [error]);

    useEffect(() => {
        onSidebarToggle?.(sidebarCollapsed);
    }, [sidebarCollapsed]);

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

    const adaptedRequirements = useMemo(() => {
        const fromProp = Array.isArray(requirements) ? requirements : requirements?.results ?? [];
        const base = fromProp.length > 0 ? fromProp : (() => {
            const planEval = activePlan?.evaluation;
            if (planEval) return Array.isArray(planEval) ? planEval : planEval?.results ?? [];
            return [];
        })();
        
        if (studentType === "grad") {
            return base.filter((req: any) => (req.degree ?? req.name) !== "Core Requirements");
        }

        if (studentType === "undergrad") {
            const hasBachelor = base.some((req: any) => 
                (req.degree ?? req.name)?.includes("Bachelor")
            );
            if (!hasBachelor) {
                return base.filter((req: any) => (req.degree ?? req.name) !== "Core Requirements");
            }
        }
    
        return base;
    }, [activePlan?.evaluation, requirements, studentType]);

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

    useEffect(() => {
        if (sidebarCollapsed) {
            setTimeout(() => setSidebarCollapsedDelayed(true), 150);
        } else {
            setSidebarCollapsedDelayed(false);
        }
    }, [sidebarCollapsed]);

    useEffect(() => {
        const fetchCoursebook = async () => {
            if (!user) return;

            const codesToFetch = new Set<string>();

            allSuggestedCourses.forEach((course: any) => {
                const code = course.course_code || course.code;
                if (code) codesToFetch.add(code.toLowerCase().replace(/\s+/g, ""));
            });

            Object.values(allSemesters).forEach(yearSemesters => {
                yearSemesters.forEach(semester => {
                    if (!semester.isFromTranscript) {
                        semester.courses?.forEach((course: any) => {
                            const code = course.course_code || course.code;
                            if (code) codesToFetch.add(code.toLowerCase().replace(/\s+/g, ""));
                        });
                    }
                });
            });

            if (codesToFetch.size === 0) return;

            const newCodes = [...codesToFetch].filter(
                code => !coursebookData[code] && !coursebookFetchedRef.current.has(code)
            );
            if (newCodes.length === 0) return;

            newCodes.forEach(code => coursebookFetchedRef.current.add(code));

            const controller = new AbortController();

            try {
                const token = await user.getIdToken();
                const CRUD_API = import.meta.env.VITE_CRUD_API;
                const base = CRUD_API.replace("/CRUD", "");

                const res = await fetch(
                    `${base}/CRUD/coursebook?courses=${newCodes.join(",")}`,
                    { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }
                );

                if (!res.ok) return;
                const data = await res.json();
                const sections: any[] = data.sections;
                const semester = data.semester;
                if (semester) setCoursebookSemester(semester);

                const grouped: Record<string, any[]> = {};
                sections.forEach(sec => {
                    const key = `${sec.course_prefix}${sec.course_number}`.toLowerCase();
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(sec);
                });

                setCoursebookData(prev => ({ ...prev, ...grouped }));
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                newCodes.forEach(code => coursebookFetchedRef.current.delete(code));
                console.error("Failed to fetch coursebook data:", err);
            }

            return () => controller.abort();
        };

        fetchCoursebook();
    }, [allSuggestedCourses, allSemesters, user]);

    useEffect(() => {
        const fetchGrades = async () => {
            if (!user) return;

            const codesToFetch = new Set<string>();

            allSuggestedCourses.forEach((course: any) => {
                const code = course.course_code || course.code;
                if (code) codesToFetch.add(code.toUpperCase().replace(/\s+/g, ""));
            });

            Object.values(allSemesters).forEach(yearSemesters => {
                yearSemesters.forEach(semester => {
                    if (!semester.isFromTranscript) {
                        semester.courses?.forEach((course: any) => {
                            const code = course.course_code || course.code;
                            if (code) codesToFetch.add(code.toUpperCase().replace(/\s+/g, ""));
                        });
                    }
                });
            });

            if (codesToFetch.size === 0) return;

            const newCodes = [...codesToFetch].filter(
                code => !gradesData[code] && !gradesFetchedRef.current.has(code)
            );
            if (newCodes.length === 0) return;

            newCodes.forEach(code => gradesFetchedRef.current.add(code));
            const controller = new AbortController();

            try {
                const token = await user.getIdToken();
                const CRUD_API = import.meta.env.VITE_CRUD_API;
                const base = CRUD_API.replace("/CRUD", "");

                const res = await fetch(
                    `${base}/CRUD/utdgrades?courses=${newCodes.join(",")}`,
                    { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }
                );

                if (!res.ok) return;
                const data = await res.json();

                setGradesData(prev => ({ ...prev, ...data }));
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                newCodes.forEach(code => gradesFetchedRef.current.delete(code));
                console.error("Failed to fetch grades data:", err);
            }

            return () => controller.abort();
        };

        fetchGrades();
    }, [allSuggestedCourses, allSemesters, user]);

    const initializedYearKeysRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (Object.keys(allSemesters).length === 0) return;
    
        const now = new Date();
        const currentMonth = now.getMonth();
        const academicYearStart = currentMonth >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    
        const unprocessedKeys = Object.keys(allSemesters).filter(
            k => !initializedYearKeysRef.current.has(k)
        );
        if (unprocessedKeys.length === 0) return;
    
        unprocessedKeys.forEach(k => initializedYearKeysRef.current.add(k));
    
        const additions: Record<string, boolean> = {};
        unprocessedKeys.forEach((yearKey) => {
            const firstTitle = allSemesters[yearKey][0]?.title;
            const yearNum = Number(firstTitle?.match(/\d{4}/)?.[0]);
            additions[yearKey] = !!yearNum && yearNum < academicYearStart;
        });
    
        setUISnapshot(prev => ({
            ...prev,
            collapsedYears: { ...prev.collapsedYears, ...additions },
        }));
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
                allSemesters[yearKey].forEach((semester, _) => {
                    semester.courses?.forEach((course: any) => {
                        const status = String(course.status || "").toLowerCase();
                        if (status !== "planned") return;

                        const code = normalizeCourseCode(course.course_code || course.code);
                        if (!code) return;

                        plannedCoursePlacements.push(code);
                    });
                });
            });

        plannedCoursePlacements.sort();
        return plannedCoursePlacements.join("|");
    }, [allSemesters]);

    const firstUserSemesterKey = useMemo(() => {
        for (const yearKey of Object.keys(allSemesters)) {
            const idx = allSemesters[yearKey].findIndex(s => !s.isFromTranscript);
            if (idx !== -1) return `${yearKey}-${idx}`;
        }
        return null;
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
            await evaluatePlannerAndMergeSuggestions({
                quickEvaluation: true,
                assumeMinimumGradePass: true,
                plannerStateOverride: { plans, activePlanId },
            });
            toast.success("Suggested courses refreshed");
            setLastQuickEvalPlannedCoursesSignature(plannedCoursesSignature);

        } catch (error: any) {
            if (error?.status === 429 || error?.message?.includes('429')) {
                toast.warning("You've hit the daily evaluation limit. Try again tomorrow.");
            } else {
                toast.error("Could not refresh suggested courses");
            }
        } finally {
            try {
                await savePlannerState();
            } catch (saveError) {
                console.warn("Cloud save failed before quick eval, falling back to localStorage:", saveError);
                try {
                    localStorage.setItem('planner-state', JSON.stringify({ plans, activePlanId }));
                } catch (e) {
                    console.error("localStorage fallback also failed:", e);
                }
            }
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
        if (!course && !courseId) return;

        const result = dropCourseAction({
            targetYear,
            targetSemesterIndex,
            course,
            sourceYear,
            sourceSemesterIndex,
            courseId,
            isSuggested,
            allSemesters
        });

        if (!result.success && result.error) {
            setError(result.error);
            return;
        }

        // Clear any lingering error on a successful drop
        setError(null);
    };

    const handleAddYear = () => {
        const yearCount = Object.keys(allSemesters).length;
        if (yearCount >= allowedYears) {
            setShowExtendYearsModal(true);
            return;
        }
        addYearAction(allSemesters, allowedYears);
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
        clearYearAction(yearKey, allSemesters);
        setShowDeleteModal(false);
        setSemesterToDelete(null);
    };

    const executeDeleteYear = (yearKey: string) => {
        deleteYearAction(yearKey, allSemesters);
        setShowDeleteModal(false);
        setSemesterToDelete(null);
    };

    const handleAddSemester = (yearKey: string) => {
        const result = addSemesterAction(yearKey, allSemesters);
        if (!result.success) {
            if (result.error) {
                setError(result.error);
            }
            return;
        }
        setError(null);
    };

    const handleClearSemester = (yearKey: string, semesterIndex: number) => {
        clearSemesterAction(yearKey, semesterIndex, allSemesters);
        setShowDeleteModal(false);
        setSemesterToDelete(null);
    };

    const handleRemoveSemester = (yearKey: string, semesterIndex: number) => {
        removeSemesterAction(yearKey, semesterIndex, allSemesters);
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
            <Toaster position="top-center" richColors closeButton />
            <PlannerNavbar
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
                semesters={allSemesters}
                coursebookData={coursebookData}
                gradesData={gradesData}
            />
            <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] mt-[4rem] bg-gray-50 overflow-hidden p-6">
                {/* Action buttons */}
                <div className="fixed bottom-6 right-4 flex flex-row items-center gap-2 z-50">
                    {/* Suggest Future Classes */}
                    <button
                        onClick={runQuickEvaluation}
                        disabled={isRunningQuickEvaluation || isLoading}
                        className={`px-6 py-3 rounded-full bg-white border border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-gray-700 font-medium text-sm whitespace-nowrap ${isRunningQuickEvaluation || isLoading
                                ? 'cursor-not-allowed opacity-70'
                                : 'hover:-translate-y-0.5'
                            }`}
                        data-tour="suggest-future-classes"
                        title="Suggest Future Classes"
                    >
                        {isRunningQuickEvaluation ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <RefreshCw size={20} />
                        )}
                        <span className="hidden sm:inline">
                            {isRunningQuickEvaluation ? "Running..." : "Suggest Future Classes"}
                        </span>
                    </button>

                    {/* Save */}
                    <button
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges || isLoading}
                        className={`relative px-6 py-3 rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 ${hasUnsavedChanges ? 'hover:-translate-y-0.5' : 'cursor-default'
                            } text-white font-medium text-sm`}
                        data-tour="save-plan"
                        title="Save Plan"
                    >
                        {hasUnsavedChanges && (
                            <div className="absolute -top-0 -right-3 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                        )}
                        {isLoading ? (
                            <><Loader2 size={20} className="animate-spin" /><span className="hidden sm:inline">Saving...</span></>
                        ) : hasUnsavedChanges ? (
                            <><Save size={20} /><span className="hidden sm:inline">Save</span></>
                        ) : (
                            <><Check size={20} /><span className="hidden sm:inline">Saved</span></>
                        )}
                    </button>

                    {/* Help */}
                    <button
                        data-tour="help-button"
                        aria-label="tutorial"
                        onClick={startTutorial}
                        className="hidden sm:flex self-end translate-y-4 w-7 h-7 rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 items-center justify-center"
                    >
                        <HelpCircle size={18} className="text-white" />
                    </button>
                </div>
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
                        allCompletedCourseCodes={allCompletedCourseCodes}
                        allPlannedCoursesWithOrder={allPlannedCoursesWithOrder}
                        onRestartOnboarding={onRestartOnboarding}
                        focusLabel={focusLabel}
                        semesters={allSemesters}
                        coursebookData={coursebookData}
                        coursebookSemester={coursebookSemester}
                        gradesData={gradesData}
                        onOpenDiscovery={() => setShowDiscovery(true)}
                        discoveryCart={discoveryCart}
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
                    <div className="mb-6 flex flex-wrap items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger aria-label="plan settings" data-tour="plan-toggle" className="flex items-center gap-3 px-5 py-3 border-2 border-green-400 rounded-2xl text-base bg-white hover:bg-gray-50 shadow-sm font-medium whitespace-nowrap">
                                <span>{activePlan?.name || 'Select Plan'}</span>
                                <ChevronDown size={18} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-bglight rounded-2xl">
                                {plans.map(plan => (
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
                            <DropdownMenuTrigger data-tour="plan-settings" className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors">
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
                                        if (plans.length === 1) return;
                                        setShowPlanDeleteModal(true);
                                    }}
                                    disabled={plans.length === 1}
                                    className="text-destructive focus:text-destructive hover:bg-gray-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete plan
                                </DropdownMenuItem>

                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100">
                                        <Download className="w-4 h-4 mr-2" />
                                        Export plan
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="bg-white rounded-2xl shadow-lg p-2">
                                        <DropdownMenuItem onClick={() => activePlan && exportPlanAsPNG(activePlan)}
                                            className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100">PNG</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => activePlan && exportPlanAsJPG(activePlan)}
                                            className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100">JPG</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => activePlan && exportPlanAsPDF(activePlan)}
                                            className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100">PDF</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => activePlan && exportPlanAsCSV(activePlan)}
                                            className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer data-[highlighted]:bg-gray-100">CSV</DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {transcriptData?.catalogYear && (
                            <span data-tour="evaluation-message" className="text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1.5 bg-white whitespace-nowrap min-w-0 truncate max-w-[160px] sm:max-w-none">
                                Evaluated against{" "}
                                <span className="font-semibold text-gray-700">
                                    {transcriptData.catalogYear === "latest"
                                        ? `${calculateLatestYear()}–${calculateLatestYear() + 1}`
                                        : `${calculateCatalogYear(transcriptData?.majors?.[0]?.start_date)}–${calculateCatalogYear(transcriptData?.majors?.[0]?.start_date) + 1}`
                                    } catalog
                                </span>
                            </span>
                        )}
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

                            const hasCurrentSemester = allSemesters[yearKey].some(
                                sem => isCurrentSemester(sem.title)
                            );

                            return (
                                <div key={yearKey}>

                                    <YearDivider
                                        yearLabel={(() => {
                                            const firstTitle = allSemesters[yearKey]?.[0]?.title;
                                            const year = firstTitle?.match(/\d{4}/)?.[0];
                                            const nextYear = year ? String(Number(year) + 1) : null;
                                            return year && nextYear ? `${year} – ${nextYear}` : yearKey.replace("year", "Year ");
                                        })()}
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
                                        hasCurrentSemester={hasCurrentSemester}
                                        activePlan={activePlan}
                                    />

                                    {!isYearCollapsed && (
                                        <div className="flex flex-wrap gap-4 justify-start" data-tour="semester-area">
                                            {allSemesters[yearKey].map((semester, idx) => (
                                                <SemesterBox
                                                    key={idx}
                                                    {...semester}
                                                    data-tour={`${yearKey}-${idx}` === firstUserSemesterKey ? "user-semester" : "transcript-semester"}
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
                                                    isCollapsed={!!collapsedSemesters[`${yearKey}-${idx}`]}
                                                    onToggleCollapse={() => toggleSemesterCollapse(yearKey, idx)}
                                                    coursebookData={coursebookData}
                                                    coursebookSemester={coursebookSemester}
                                                    isCurrentSemester={isCurrentSemester(semester.title)}
                                                />
                                            ))}

                                            {allSemesters[yearKey].length < 3 && (
                                                <button
                                                    onClick={() => handleAddSemester(yearKey)}
                                                    className="hidden md:flex flex-col items-center justify-center gap-2 w-[300px] h-[300px] self-start rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-green-400 hover:text-green-500 transition-colors"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Add Semester</span>
                                                </button>
                                            )}
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
                                <span>{Object.keys(allSemesters).length >= allowedYears ? 'Need More Years?' : 'Add Another Year'}</span>
                            </button>
                        </div>
                    )}

                    <div className="flex lg:hidden justify-center pb-4 pointer-events-none">
                        <span className="text-gray-400 text-[10px] text-center px-4">
                            Degree plan evaluations are not official and may be incomplete or incorrect. Verify with your academic advisor or official catalogs.
                        </span>
                    </div>

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
                                    maxLength={50}
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

                    {showDiscovery && (
                        <CourseDiscoveryModal
                            onClose={() => setShowDiscovery(false)}
                            onAddToPlan={(_) => {
                                setShowDiscovery(false);
                            }}
                            semester={coursebookSemester ?? ''}
                            cart={discoveryCart}
                            onCartChange={setDiscoveryCart}
                            semesters={activePlan?.semesters ?? {}}
                            dropCourse={dropCourse}
                            apiBaseUrl={import.meta.env.VITE_CRUD_API}
                            authToken={authToken}
                            completedCourseCodes={allCompletedCourseCodes}
                            educationLevel={educationLevel}
                        />
                    )}

                    {showExtendYearsModal && (
                        <div
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
                            onClick={() => { setShowExtendYearsModal(false); setExtendRequestSent(false); }}
                        >
                            <div
                                className="bg-white p-6 rounded-2xl shadow-lg max-w-md w-full mx-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {extendRequestSent ? (
                                    <>
                                        <h3 className="font-semibold text-lg mb-2">Request sent!</h3>
                                        <p className="text-sm text-gray-500 mb-4">We'll review your request and update your account shortly.</p>
                                        <button
                                            onClick={() => { setShowExtendYearsModal(false); setExtendRequestSent(false); }}
                                            className="w-full px-4 py-2 text-sm bg-green-500 text-white rounded-full hover:bg-green-600"
                                        >
                                            Got it
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="font-semibold text-lg mb-1">Need more years?</h3>
                                        <p className="text-sm text-gray-500 mb-4">You've hit the {allowedYears}-year limit. Let us know how many you need and we'll get you sorted.</p>
                                        <label className="text-sm font-medium text-gray-700">How many years do you need in total?</label>
                                        <input
                                            type="number"
                                            min={allowedYears + 1}
                                            max={20}
                                            value={requestedYears}
                                            onChange={(e) => setRequestedYears(Number(e.target.value))}
                                            className="border rounded-lg px-3 py-2 w-full mt-1 mb-4"
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => setShowExtendYearsModal(false)}
                                                className="px-4 py-2 text-sm bg-gray-200 rounded-full hover:bg-gray-300"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const token = await user?.getIdToken();
                                                        await fetch(import.meta.env.VITE_CRUD_API, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                action: 'requestExtendedYears',
                                                                userId: user?.uid,
                                                                token,
                                                                requestedYears
                                                            })
                                                        });
                                                        setExtendRequestSent(true);
                                                    } catch {
                                                        toast.error('Failed to send request. Try again.');
                                                    }
                                                }}
                                                className="px-4 py-2 text-sm bg-green-500 text-white rounded-full hover:bg-green-600"
                                            >
                                                Send Request
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Planner;