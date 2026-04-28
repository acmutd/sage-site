import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import { getCreditsFromCourseCode } from "@/utils/plannerCredits";
import { normalizeCourseCode } from '@/utils/prerequisiteUtils';

const isPlannedStatus = (course: any): boolean =>
    String(course?.status ?? "").toLowerCase() === "planned";

const getCourseCode = (course: any): string =>
    normalizeCourseCode(course?.course_code ?? course?.code);

const toFiniteNumber = (value: unknown): number => {
    const n =
        typeof value === "number"
            ? value
            : Number(String(value ?? ""));
    return Number.isFinite(n) ? n : 0;
};

const getCourseCredits = (course: any): number => {
    const rawCredits =
        course?.credits_planned ??
        course?.credits ??
        course?.credits_attempted ??
        course?.credits_earned;
    const n = toFiniteNumber(rawCredits);
    if (n > 0) return n;
    return getCreditsFromCourseCode(course?.course_code ?? course?.code);
};

const getRepeatableMaxFromCourse = (course: any): number => {
    const a = toFiniteNumber(course?.repeatable_for_hours);
    const b = toFiniteNumber(course?.max_repeat_credits);
    return Math.max(0, a, b);
};

const getRepeatableMaxByCodeFromEvaluation = (evaluation: any): Map<string, number> => {
    const out = new Map<string, number>();
    const requirements = Array.isArray(evaluation)
        ? evaluation
        : Array.isArray(evaluation?.results)
            ? evaluation.results
            : [];

    const walkCategories = (categories: any[]) => {
        if (!Array.isArray(categories)) return;
        categories.forEach((category: any) => {
            if (Array.isArray(category?.suggested)) {
                category.suggested.forEach((c: any) => {
                    const code = normalizeCourseCode(c?.code ?? c?.course_code);
                    if (!code) return;
                    const max = toFiniteNumber(c?.repeatable_for_hours);
                    if (max <= 0) return;
                    out.set(code, Math.max(out.get(code) ?? 0, max));
                });
            }
            if (Array.isArray(category?.categories)) {
                walkCategories(category.categories);
            }
        });
    };

    requirements.forEach((req: any) => {
        if (Array.isArray(req?.categories)) walkCategories(req.categories);
    });

    return out;
};

const computePlacedCourses = (semesters: any, evaluation: any): string[] => {
    const plannedCreditsByCode = new Map<string, number>();
    const repeatableMaxByCode = getRepeatableMaxByCodeFromEvaluation(evaluation);

    Object.values(semesters || {}).forEach((yearSemesters: any) => {
        (yearSemesters || []).forEach((semester: any) => {
            (semester?.courses || []).forEach((course: any) => {
                if (!isPlannedStatus(course)) return;
                const code = getCourseCode(course);
                if (!code) return;

                plannedCreditsByCode.set(
                    code,
                    (plannedCreditsByCode.get(code) ?? 0) + getCourseCredits(course)
                );

                const maxFromCourse = getRepeatableMaxFromCourse(course);
                if (maxFromCourse > 0) {
                    repeatableMaxByCode.set(code, Math.max(repeatableMaxByCode.get(code) ?? 0, maxFromCourse));
                }
            });
        });
    });

    const placed = new Set<string>();
    plannedCreditsByCode.forEach((plannedCredits, code) => {
        const maxRepeatCredits = repeatableMaxByCode.get(code) ?? 0;
        if (maxRepeatCredits > 0) {
            if (plannedCredits >= maxRepeatCredits) placed.add(code);
            return;
        }
        if (plannedCredits > 0) placed.add(code);
    });

    return Array.from(placed);
};

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
    evaluation: any;
    schedulePlan?: {
        [semesterTitle: string]: {
            selectedSections: Record<string, string>; // courseCode to sectionKey
            colorOverrides: Record<string, string>; // courseCode to hex
        }
    };
}

interface PlannerData {
    plans: SavedPlannerState[];
    activePlanId: string;
}

export interface StagedCourse {
    course_id: string;
    course_code: string;
    course_name: string;
    credits: number;
    prereqs_met: boolean;
    prereqs_text?: string;
    coreqs_text?: string;
    satisfies_core: boolean;
    prerequisites?: any;
    'Pre-Requisite'?: any;
    description?: string;
}

interface PlannerStore extends PlannerData {
    // Unsaved Changes Tracking
    lastSavedState: string | null;
    markAsSaved: () => void;
    getHasUnsavedChanges: () => boolean;
    
    // Plan Management Actions
    switchPlan: (planId: string) => void;
    createNewPlan: (initialPlannerState: any, evaluation: any, customName?: string) => void;
    duplicatePlan: () => void;
    deletePlan: () => void;
    renamePlan: (newName: string) => void;
    
    // Semester Management Actions
    addYear: (allSemesters: any, allowedYears?: number) => void;
    clearYear: (yearKey: string, allSemesters: any) => void;
    deleteYear: (yearKey: string, allSemesters: any) => void;
    addSemester: (yearKey: string, allSemesters: any) => { success: boolean; error?: string };
    clearSemester: (yearKey: string, semesterIndex: number, allSemesters: any) => void;
    removeSemester: (yearKey: string, semesterIndex: number, allSemesters: any) => void;
    dropCourse: (params: {
        targetYear: string;
        targetSemesterIndex: number;
        course: any;
        sourceYear: string;
        sourceSemesterIndex: number;
        courseId?: string;
        isSuggested?: boolean;
        allSemesters: any;
    }) => { success: boolean; error?: string };
    
    // schedule generation 
    saveSchedulePlan: (semesterTitle: string, selectedSections: Record<string, string>, colorOverrides: Record<string, string>) => void;

    stagedCourses: StagedCourse[];
    addStagedCourses: (courses: StagedCourse[]) => void;
    removeStagedCourse: (courseId: string) => void;
    clearStagedCourses: () => void;

    // Helper to update active plan
    updateActivePlan: (updates: Partial<SavedPlannerState>) => void;

    // Cloud Sync
    syncFromCloud: (cloudData: { plans: SavedPlannerState[]; activePlanId: string }) => void;

    // history stack
    past: SavedPlannerState[][];
    future: SavedPlannerState[][];
    undo: () => void;
    redo: () => void;
}

export const usePlannerStore = create<PlannerStore>()(
    persist(
        immer((set, get) => ({        
            plans: [],
            activePlanId: '',            
            lastSavedState: null,
            past: [],
            future: [],
            stagedCourses: [],

            // Unsaved Changes Tracking
            
            markAsSaved: () => {
                const { plans, activePlanId } = get();
                const currentState = { plans, activePlanId };
                set({ lastSavedState: JSON.stringify(currentState) });
            },
            
            getHasUnsavedChanges: () => {
                const { plans, activePlanId, lastSavedState } = get();
                if (!lastSavedState) return true;
                
                const currentState = JSON.stringify({ plans, activePlanId });
                return currentState !== lastSavedState;
            },

            undo: () => {
                set((state) => {
                    if (state.past.length === 0) return;
                    const previous = state.past[state.past.length - 1];
                    state.future = [JSON.parse(JSON.stringify(state.plans)), ...state.future.slice(0, 49)];
                    state.past = state.past.slice(0, -1);
                    state.plans = previous;
                });
            },

            redo: () => {
                set((state) => {
                    if (state.future.length === 0) return;
                    const next = state.future[0];
                    state.past = [...state.past.slice(-49), JSON.parse(JSON.stringify(state.plans))];
                    state.future = state.future.slice(1);
                    state.plans = next;
                });
            },
            
            // Plan Management Actions
            
            switchPlan: (planId: string) => {
                set((state) => {
                    state.activePlanId = planId;
                });
            },
            
            createNewPlan: (initialPlannerState: any, evaluation: any, customName?: string) => {
                const state = get();
                if (state.plans.length >= 5) {
                    toast.error('Maximum of 5 plans allowed');
                    return;
                }
                
                const newPlanId = crypto.randomUUID();
                const planNumber = state.plans.length + 1;
                const planName = customName || `Plan ${planNumber}`;
                
                set((draft) => {
                draft.plans.push({
                    id: newPlanId,
                    name: planName,
                    semesters: initialPlannerState,
                    placedCourses: [],
                    lastModified: Date.now(),
                    evaluation: evaluation
                });
                draft.activePlanId = newPlanId;
                });
                
                toast.success('Created new plan');
            },
            
            duplicatePlan: () => {
                const state = get();
                if (state.plans.length >= 5) {
                    toast.error('Maximum of 5 plans allowed');
                    return;
                }
                
                const currentPlan = state.plans.find(p => p.id === state.activePlanId);
                if (!currentPlan) return;
                
                const newPlanId = crypto.randomUUID();
                
                set((draft) => {
                    draft.plans.push({
                        ...currentPlan,
                        id: newPlanId,
                        name: `${currentPlan.name} (Copy)`,
                        lastModified: Date.now()
                    });
                    draft.activePlanId = newPlanId;
                });
                
                toast.success('Duplicated plan');
            },
            
            deletePlan: () => {
                const state = get();
                if (state.plans.length === 1) {
                    toast.error('Cannot delete the last plan');
                    return;
                }
                
                const currentIndex = state.plans.findIndex(p => p.id === state.activePlanId);
                const newActivePlanId = currentIndex > 0 
                ? state.plans[currentIndex - 1].id 
                : state.plans[1].id;
                
                set((draft) => {
                    draft.plans = draft.plans.filter(p => p.id !== state.activePlanId);
                    draft.activePlanId = newActivePlanId;
                });
                
                toast.success('Deleted plan');
            },
            
            renamePlan: (newName: string) => {
                if (!newName.trim()) {
                    toast.error('Plan name cannot be empty');
                    return;
                }
                
                set((state) => {
                    const plan = state.plans.find(p => p.id === state.activePlanId);
                    if (plan) {
                        plan.name = newName.trim();
                        plan.lastModified = Date.now();
                    }
                });
                
                toast.success('Renamed plan');
            },
            
            // ========== Semester Management Actions ==========
            
            addYear: (allSemesters: any, allowedYears: number = 10) => {
                const yearCount = Object.keys(allSemesters).length;
    
                if (yearCount >= allowedYears) {
                    return;
                }

                const yearNumbers = Object.keys(allSemesters)
                    .map(key => parseInt(key.replace('year', '')))
                    .filter(num => !isNaN(num));
                const nextYearNum = yearNumbers.length === 0 ? 1 : Math.max(...yearNumbers) + 1;
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

                set((state) => {
                    state.past = [...state.past.slice(-49), JSON.parse(JSON.stringify(state.plans))];
                    state.future = [];
                    const plan = state.plans.find(p => p.id === state.activePlanId);
                    if (plan) {
                        plan.semesters = {
                            ...plan.semesters,
                            [nextYear]: [
                                { title: `Fall ${nextFallYear}`, courses: [], isLocked: false }
                            ]
                        };
                        plan.lastModified = Date.now();
                    }
                });
            },
            
            clearYear: (yearKey: string, allSemesters: any) => {
                void allSemesters;
                set((state) => {
                    state.past = [...state.past.slice(-49), JSON.parse(JSON.stringify(state.plans))];
                    state.future = [];
                    const plan = state.plans.find(p => p.id === state.activePlanId);
                    if (plan) {
                        // Clear courses in non-transcript semesters
                        plan.semesters[yearKey].forEach((semester: any) => {
                            if (!semester.isFromTranscript) {
                                semester.courses = [];
                            }
                        });

                        plan.placedCourses = computePlacedCourses(plan.semesters, plan.evaluation);
                        plan.lastModified = Date.now();
                    }
                });
            },
            
            deleteYear: (yearKey: string, allSemesters: any) => {
                void allSemesters;
                set((state) => {
                    state.past = [...state.past.slice(-49), JSON.parse(JSON.stringify(state.plans))];
                    state.future = [];                
                    const plan = state.plans.find(p => p.id === state.activePlanId);
                    if (plan) {
                        // Remove the year
                        delete plan.semesters[yearKey];

                        plan.placedCourses = computePlacedCourses(plan.semesters, plan.evaluation);
                        plan.lastModified = Date.now();
                    }
                });
            },
            
            addSemester: (yearKey: string, allSemesters: any) => {
                const yearSemesters = [...allSemesters[yearKey]];

                if (yearSemesters.length >= 3) {
                    return { 
                        success: false, 
                        error: `Cannot add more than 3 semesters (Fall, Spring, Summer) to ${yearKey.replace("year", "Year ")}` 
                    };
                }

                const firstSemester = yearSemesters[0];
                const baseYear = parseInt(firstSemester.title.split(' ')[1]);

                const allPossibleSemesters = [
                    { title: `Fall ${baseYear}`, courses: [], isFromTranscript: false, isLocked: false },
                    { title: `Spring ${baseYear + 1}`, courses: [], isFromTranscript: false, isLocked: false },
                    { title: `Summer ${baseYear + 1}`, courses: [], isFromTranscript: false, isLocked: false }
                ];

                const existingTitles = yearSemesters.map((s: any) => s.title);
                const missingSemesters = allPossibleSemesters.filter(
                    sem => !existingTitles.includes(sem.title)
                );

                if (missingSemesters.length === 0) {
                    return { success: false };
                }
                
                const updatedSemesters = [...yearSemesters, missingSemesters[0]];
                updatedSemesters.sort((a, b) => {
                    const order: Record<string, number> = { 'Fall': 0, 'Spring': 1, 'Summer': 2 };
                    const seasonA = a.title.split(' ')[0];
                    const seasonB = b.title.split(' ')[0];
                    return order[seasonA] - order[seasonB];
                });

                set((state) => {
                    state.past = [...state.past.slice(-49), JSON.parse(JSON.stringify(state.plans))];
                    state.future = [];
                    const plan = state.plans.find(p => p.id === state.activePlanId);
                    if (plan) {
                        plan.semesters[yearKey] = updatedSemesters;
                        plan.lastModified = Date.now();
                    }
                });
                
                return { success: true };
            },
            
            clearSemester: (yearKey: string, semesterIndex: number, allSemesters: any) => {
                void allSemesters;
                set((state) => {
                    state.past = [...state.past.slice(-49), JSON.parse(JSON.stringify(state.plans))];
                    state.future = [];
                    const plan = state.plans.find(p => p.id === state.activePlanId);
                    if (plan) {
                        plan.semesters[yearKey][semesterIndex].courses = [];

                        plan.placedCourses = computePlacedCourses(plan.semesters, plan.evaluation);
                        plan.lastModified = Date.now();
                    }
                });
            },
            
            removeSemester: (yearKey: string, semesterIndex: number, allSemesters: any) => {
                void allSemesters;
                set((state) => {
                    state.past = [...state.past.slice(-49), JSON.parse(JSON.stringify(state.plans))];
                    state.future = [];
                    const plan = state.plans.find(p => p.id === state.activePlanId);
                    if (plan) {
                        const yearSemesters = [...plan.semesters[yearKey]];
                        
                        if (yearSemesters.length === 1) {
                            // Remove entire year if it's the last semester
                            delete plan.semesters[yearKey];
                        } else {
                            // Remove just the semester
                            yearSemesters.splice(semesterIndex, 1);
                            plan.semesters[yearKey] = yearSemesters;
                        }

                        plan.placedCourses = computePlacedCourses(plan.semesters, plan.evaluation);
                        plan.lastModified = Date.now();
                    }
                });
            },
            
            dropCourse: (params) => {
                const {
                    targetYear,
                    targetSemesterIndex,
                    course,
                    sourceYear,
                    sourceSemesterIndex,
                    courseId,
                    isSuggested,
                    allSemesters
                } = params;
                
                const isRemoval =
                    !course || !targetYear ||
                    targetYear === '' ||
                    targetSemesterIndex === undefined ||
                    targetSemesterIndex === null ||
                    targetSemesterIndex < 0;

                // Removal
                if (isRemoval) {
                    set((state) => {
                        state.past = [...state.past.slice(-49), JSON.parse(JSON.stringify(state.plans))];
                        state.future = [];
                        const plan = state.plans.find(p => p.id === state.activePlanId);
                        if (!plan) return;
                        
                        const sourceSemester = plan.semesters[sourceYear]?.[sourceSemesterIndex];
                        if (sourceSemester?.courses) {
                            const courseIndex = sourceSemester.courses.findIndex(
                                (c: any) => c.id === courseId
                            );
                            if (courseIndex !== -1) {
                                sourceSemester.courses.splice(courseIndex, 1);
                            }
                        }
                        plan.placedCourses = computePlacedCourses(plan.semesters, plan.evaluation);
                        plan.lastModified = Date.now();
                    });
                    return { success: true };
                }

                const courseCode = normalizeCourseCode(course.code || course.course_code);
                const planForRules = get().plans.find(p => p.id === get().activePlanId);
                const repeatableMaxByCode = getRepeatableMaxByCodeFromEvaluation(planForRules?.evaluation);
                const repeatableMaxCredits =
                    Math.max(
                        getRepeatableMaxFromCourse(course),
                        repeatableMaxByCode.get(courseCode) ?? 0
                    );

                if (!isSuggested && course.originalLocation) {
                    const isOriginalLocation =
                        targetYear === course.originalLocation.yearKey &&
                        targetSemesterIndex === course.originalLocation.semesterIndex;

                    if (!isOriginalLocation) {
                        const originalSemester = allSemesters[course.originalLocation.yearKey][course.originalLocation.semesterIndex];
                        return { 
                            success: false, 
                            error: `${courseCode} can only be moved back to ${originalSemester.title}` 
                        };
                    }
                }

                // Prevent duplicates within the same semester (regardless of repeatability).
                const targetSemester = allSemesters?.[targetYear]?.[targetSemesterIndex];
                if (targetSemester?.courses?.some((c: any) => {
                    const code = normalizeCourseCode(c?.course_code ?? c?.code);
                    if (!code) return false;
                    if (code !== courseCode) return false;
                    return !courseId || c?.id !== courseId;
                })) {
                    return {
                        success: false,
                        error: `${courseCode} is already in ${targetSemester.title}`
                    };
                }
                
                // Non-repeatable: block duplicates across semesters.
                if (repeatableMaxCredits <= 0) {
                    for (const yearKey in allSemesters) {
                        for (let idx = 0; idx < allSemesters[yearKey].length; idx++) {
                            const semester = allSemesters[yearKey][idx];
                            if (yearKey === sourceYear && idx === sourceSemesterIndex) continue;

                            const exists = (semester?.courses || []).some((c: any) =>
                                normalizeCourseCode(c?.course_code ?? c?.code) === courseCode
                            );
                            if (exists) {
                                return {
                                    success: false,
                                    error: `${courseCode} is already in ${semester.title}`
                                };
                            }
                        }
                    }
                } else if (isSuggested) {
                    // Repeatable: enforce max repeat credits across the plan.
                    let usedPlannedCredits = 0;
                    for (const yearKey in allSemesters) {
                        for (let idx = 0; idx < allSemesters[yearKey].length; idx++) {
                            const semester = allSemesters[yearKey][idx];
                            (semester?.courses || []).forEach((c: any) => {
                                if (!isPlannedStatus(c)) return;
                                const code = normalizeCourseCode(c?.course_code ?? c?.code);
                                if (!code || code !== courseCode) return;
                                usedPlannedCredits += getCourseCredits(c);
                            });
                        }
                    }

                    const nextCredits = usedPlannedCredits + getCourseCredits(course);
                    if (nextCredits > repeatableMaxCredits) {
                        return {
                            success: false,
                            error: `${courseCode} can only be repeated for ${repeatableMaxCredits} credit hours`
                        };
                    }
                }

                set((state) => {
                    const plan = state.plans.find(p => p.id === state.activePlanId);
                    if (!plan) return;

                    if (isSuggested) {
                        // Adding a suggested course
                        const targetSemester = plan.semesters[targetYear][targetSemesterIndex];
                        if (targetSemester && Array.isArray(targetSemester.courses)) {
                            const newCourseId = `${targetYear}-${targetSemester.title}-${courseCode}-${targetSemester.courses.length}-${Date.now()}`;

                            const newCourse: Record<string, any> = {
                                course_code: courseCode,
                                course_name: course.name || course.course_name || `${courseCode} Course`,
                                credits_planned: getCourseCredits(course),
                                id: newCourseId,
                                status: 'planned',
                                repeatable_for_hours: toFiniteNumber(course.repeatable_for_hours),
                                max_repeat_credits: toFiniteNumber(course.max_repeat_credits),
                            };

                            if (course.prerequisites) newCourse.prerequisites = course.prerequisites;
                            if (course['Pre-Requisite']) newCourse['Pre-Requisite'] = course['Pre-Requisite'];

                            targetSemester.courses.push(newCourse);
                        }
                    } else {
                        // Moving existing course
                        if (sourceYear && sourceSemesterIndex !== undefined) {
                            const sourceSemester = plan.semesters[sourceYear][sourceSemesterIndex];
                            if (sourceSemester && Array.isArray(sourceSemester.courses)) {
                                const courseIndex = sourceSemester.courses.findIndex(
                                    (c: any) => c.id === courseId
                                );

                                if (courseIndex !== -1) {
                                    const [removedCourse] = sourceSemester.courses.splice(courseIndex, 1);

                                    if (targetYear && targetSemesterIndex !== undefined) {
                                        const targetSemester = plan.semesters[targetYear][targetSemesterIndex];
                                        if (targetSemester && Array.isArray(targetSemester.courses)) {
                                            targetSemester.courses.push(removedCourse);
                                        }
                                    }
                                }
                            }
                        }
                    }

                    plan.placedCourses = computePlacedCourses(plan.semesters, plan.evaluation);
                    
                    plan.lastModified = Date.now();
                });

                return { success: true };
            },
            
            // ========== Helper to Update Active Plan ==========
            
            updateActivePlan: (updates: Partial<SavedPlannerState>) => {
                set((state) => {
                const plan = state.plans.find(p => p.id === state.activePlanId);
                if (plan) {
                    Object.assign(plan, updates);
                    plan.lastModified = Date.now();
                }
                });
            },
            
            saveSchedulePlan: (semesterTitle, selectedSections, colorOverrides) => {
                set((state) => {
                    const plan = state.plans.find(p => p.id === state.activePlanId);
                    if (plan) {
                        if (!plan.schedulePlan) plan.schedulePlan = {};
                        plan.schedulePlan[semesterTitle] = { selectedSections, colorOverrides };
                        plan.lastModified = Date.now();
                    }
                });
            },
            
            // discovery courses (capped at 15 because across all five plans, we have 75 of these which is prob worth like a few bytes (maybe KBs)? but def don't approach MBs)
            addStagedCourses: (courses: StagedCourse[]) => {
                set((state) => {
                    const existingIds = new Set(state.stagedCourses.map(c => c.course_id));
                    const newOnes = courses.filter(c => !existingIds.has(c.course_id));
                    // Cap at 15 total staged courses
                    state.stagedCourses = [...state.stagedCourses, ...newOnes].slice(0, 15);
                });
            },
             
            removeStagedCourse: (courseId: string) => {
                set((state) => {
                    state.stagedCourses = state.stagedCourses.filter(c => c.course_id !== courseId);
                });
            },
             
            clearStagedCourses: () => {
                set((state) => {
                    state.stagedCourses = [];
                });
            },

            // Cloud Sync
            syncFromCloud: (cloudData: { plans: SavedPlannerState[]; activePlanId: string }) => {
                set((state) => {
                    state.plans = (cloudData.plans || []).map((plan) => ({
                        ...plan,
                        placedCourses: computePlacedCourses(plan?.semesters, plan?.evaluation),
                    }));
                    state.activePlanId = cloudData.activePlanId;
                });
            },
        })),    
        {
        name: 'planner-state', // localStorage key
        version: 2,
        migrate: (persisted: any) => {
            const nextPlans = (persisted?.plans || []).map((plan: any) => ({
                ...plan,
                placedCourses: computePlacedCourses(plan?.semesters, plan?.evaluation),
            }));
            return { ...persisted, plans: nextPlans };
        },
        partialize: (state) => ({
            plans: state.plans,
            activePlanId: state.activePlanId,
            stagedCourses: state.stagedCourses,
        }), 
        }
    )
);
