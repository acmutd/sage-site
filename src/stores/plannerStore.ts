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
            
            // Update semesters within active plan
            
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
