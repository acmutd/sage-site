import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';

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
}

interface PlannerData {
    plans: SavedPlannerState[];
    activePlanId: string;
}

interface PlannerStore extends PlannerData {
    // Plan Management Actions
    switchPlan: (planId: string) => void;
    createNewPlan: (initialPlannerState: any, evaluation: any, customName?: string) => void;
    duplicatePlan: () => void;
    deletePlan: () => void;
    renamePlan: (newName: string) => void;
    
    // Semester Management Actions
    addYear: (allSemesters: any) => void;
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
    
    // Helper to update active plan
    updateActivePlan: (updates: Partial<SavedPlannerState>) => void;
}

export const usePlannerStore = create<PlannerStore>()(
    persist(
        immer((set, get) => ({        
            // Persist middleware loads from localStorage
            plans: [],
            activePlanId: '',
            
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
            
            addYear: (allSemesters: any) => {
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
                const courseCodesToRemove: string[] = [];
                allSemesters[yearKey].forEach((semester: any) => {
                    if (!semester.isFromTranscript) {
                        semester.courses?.forEach((course: any) => {
                            if (course.status === 'planned') {
                                const code = course.course_code || course.code;
                                if (code) courseCodesToRemove.push(code);
                            }
                        });
                    }
                });

                set((state) => {
                    const plan = state.plans.find(p => p.id === state.activePlanId);
                    if (plan) {
                        // Clear courses in non-transcript semesters
                        plan.semesters[yearKey].forEach((semester: any) => {
                            if (!semester.isFromTranscript) {
                                semester.courses = [];
                            }
                        });
                        
                        // Update placed courses
                        if (courseCodesToRemove.length > 0) {
                            const newPlaced = new Set(plan.placedCourses);
                            courseCodesToRemove.forEach(code => newPlaced.delete(code));
                            plan.placedCourses = Array.from(newPlaced);
                        }
                        
                        plan.lastModified = Date.now();
                    }
                });
            },
            
            deleteYear: (yearKey: string, allSemesters: any) => {
                const courseCodesToRemove: string[] = [];
                allSemesters[yearKey].forEach((semester: any) => {
                    semester.courses?.forEach((course: any) => {
                        if (course.status === 'planned') {
                            const code = course.course_code || course.code;
                            if (code) courseCodesToRemove.push(code);
                        }
                    });
                });

                set((state) => {
                    const plan = state.plans.find(p => p.id === state.activePlanId);
                    if (plan) {
                        // Remove the year
                        delete plan.semesters[yearKey];
                        
                        // Update placed courses
                        if (courseCodesToRemove.length > 0) {
                            const newPlaced = new Set(plan.placedCourses);
                            courseCodesToRemove.forEach(code => newPlaced.delete(code));
                            plan.placedCourses = Array.from(newPlaced);
                        }
                        
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
                    const plan = state.plans.find(p => p.id === state.activePlanId);
                    if (plan) {
                        plan.semesters[yearKey] = updatedSemesters;
                        plan.lastModified = Date.now();
                    }
                });
                
                return { success: true };
            },
            
            clearSemester: (yearKey: string, semesterIndex: number, allSemesters: any) => {
                const semesterToClear = allSemesters[yearKey]?.[semesterIndex];
                const courseCodesToRemove: string[] = [];
                
                if (semesterToClear?.courses) {
                    semesterToClear.courses.forEach((course: any) => {
                        if (course.status === 'planned') {
                            const courseCode = course.course_code || course.code;
                            if (courseCode) courseCodesToRemove.push(courseCode);
                        }
                    });
                }

                set((state) => {
                    const plan = state.plans.find(p => p.id === state.activePlanId);
                    if (plan) {
                        plan.semesters[yearKey][semesterIndex].courses = [];
                        
                        if (courseCodesToRemove.length > 0) {
                            const newPlaced = new Set(plan.placedCourses);
                            courseCodesToRemove.forEach(code => newPlaced.delete(code));
                            plan.placedCourses = Array.from(newPlaced);
                        }
                        
                        plan.lastModified = Date.now();
                    }
                });
            },
            
            removeSemester: (yearKey: string, semesterIndex: number, allSemesters: any) => {
                const semesterToRemove = allSemesters[yearKey]?.[semesterIndex];
                const courseCodesToRemove: string[] = [];
                
                if (semesterToRemove?.courses) {
                    semesterToRemove.courses.forEach((course: any) => {
                        if (course.status === 'planned') {
                            const courseCode = course.course_code || course.code;
                            if (courseCode) courseCodesToRemove.push(courseCode);
                        }
                    });
                }

                set((state) => {
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
                        
                        if (courseCodesToRemove.length > 0) {
                            const newPlaced = new Set(plan.placedCourses);
                            courseCodesToRemove.forEach(code => newPlaced.delete(code));
                            plan.placedCourses = Array.from(newPlaced);
                        }
                        
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
                        const plan = state.plans.find(p => p.id === state.activePlanId);
                        if (!plan) return;
                        
                        const sourceSemester = plan.semesters[sourceYear]?.[sourceSemesterIndex];
                        if (sourceSemester?.courses) {
                            const courseIndex = sourceSemester.courses.findIndex(
                                (c: any) => c.id === courseId
                            );
                            if (courseIndex !== -1) {
                                const removedCourse = sourceSemester.courses[courseIndex];
                                if (removedCourse.status === 'planned') {
                                    const courseCode = removedCourse.course_code || removedCourse.code;
                                    const newPlaced = new Set(plan.placedCourses);
                                    newPlaced.delete(courseCode);
                                    plan.placedCourses = Array.from(newPlaced);
                                }
                                sourceSemester.courses.splice(courseIndex, 1);
                            }
                        }
                        plan.lastModified = Date.now();
                    });
                    return { success: true };
                }

                const courseCode = course.code || course.course_code;

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
                
                for (const yearKey in allSemesters) {
                    for (let idx = 0; idx < allSemesters[yearKey].length; idx++) {
                        const semester = allSemesters[yearKey][idx];
                        if (yearKey === sourceYear && idx === sourceSemesterIndex) continue;
                        
                        const exists = semester.courses.some((c: any) => c.course_code === courseCode);
                        if (exists) {
                            return { 
                                success: false, 
                                error: `${courseCode} is already in ${semester.title}` 
                            };
                        }
                    }
                }

                set((state) => {
                    const plan = state.plans.find(p => p.id === state.activePlanId);
                    if (!plan) return;

                    if (isSuggested) {
                        // Adding a suggested course
                        const targetSemester = plan.semesters[targetYear][targetSemesterIndex];
                        if (targetSemester && Array.isArray(targetSemester.courses)) {
                            const newCourseId = `${targetYear}-${targetSemester.title}-${course.course_code}-${targetSemester.courses.length}-${Date.now()}`;

                            const newCourse: Record<string, any> = {
                                course_code: course.code || course.course_code,
                                course_name: course.name || course.course_name || `${course.code || course.course_code} Course`,
                                credits_planned: course.credits || 3,
                                id: newCourseId,
                                status: 'planned',
                            };

                            if (course.prerequisites) newCourse.prerequisites = course.prerequisites;
                            if (course['Pre-Requisite']) newCourse['Pre-Requisite'] = course['Pre-Requisite'];

                            targetSemester.courses.push(newCourse);
                            
                            plan.placedCourses = Array.from(new Set([...plan.placedCourses, courseCode]));
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
        })),    
        {
        name: 'planner-state', // localStorage key
        partialize: (state) => ({
            plans: state.plans,
            activePlanId: state.activePlanId,
        }), 
        }
    )
);
