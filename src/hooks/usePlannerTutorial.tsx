import { useEffect, useRef, useState } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import type { User } from "firebase/auth";

interface UsePlannerTutorialOptions {
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    user: User | null | undefined;
    onForceExpandSidebar?: () => void;
    hasSeenTutorial: boolean;
}

const PLAN_REC_SELECTOR = '[data-tour="program-recommendations"]';
const PLAN_REC_VIEW_SELECTOR = '[data-tour="program-recommendations-view"]';

const findVisible = (selector: string) =>
    [...document.querySelectorAll<HTMLElement>(selector)].find((el) => el.getClientRects().length > 0);

const activeSteps = (steps: DriveStep[]) =>
    steps.filter((step) => typeof step.element !== 'function' || !!step.element());

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForVisible = async (selector: string, timeoutMs: number) => {
    const deadline = Date.now() + timeoutMs;
    while (!findVisible(selector) && Date.now() < deadline) await sleep(100);
};

export function usePlannerTutorial({ scrollContainerRef, user, onForceExpandSidebar, hasSeenTutorial }: UsePlannerTutorialOptions) {
    onHighlightStarted: () => {
        onForceExpandSidebar?.();
    }
    const [driverObj, setDriverObj] = useState<any>(null);
    const dropdownWasOpenedRef = useRef(false);
    const allStepsRef = useRef<DriveStep[]>([]);
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    useEffect(() => {
        const allSteps: DriveStep[] = [
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
                element: '[data-tour="course-discovery"]',
                popover: {
                    title: 'Discover Courses',
                    description: 'Browse courses and add them to your plan.',
                    side: "right"
                }
            },
            {
                element: () => findVisible(PLAN_REC_SELECTOR) as HTMLElement,
                popover: {
                    title: 'Suggested Minors & Certs',
                    description: 'Programs you\'re already partway through, based on your courses. Click one to add it in Edit Plans.',
                    side: "right"
                }
            },
            {
                element: () => findVisible(PLAN_REC_VIEW_SELECTOR) as HTMLElement,
                popover: {
                    title: 'List or Cards',
                    description: 'Switch between a compact list and one card at a time. Click the title to collapse it.',
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
                element: '[data-tour="plan-toggle"]',
                popover: {
                    title: 'Selecting Plans',
                    description: 'Here, you can select the many plans you\'ve saved and easily switch to them',
                    side: "bottom"
                }
            },
            {
                element: '[data-tour="plan-settings"]',
                popover: {
                    title: 'Plan Options',
                    description: 'Click here to view plan settings, like creating, renaming, duplicating, and deleting plans',
                    side: "bottom"
                }
            },
            {
                element: '[data-tour="evaluation-message"]',
                popover: {
                    title: 'Selected catalog',
                    description: 'Shows which catalog your degree requirements are evaluated against. You can change this in Edit Plans if your assigned catalog differs.',
                    side: "bottom"
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
                            // Look steps up by selector so adding/skipping steps can't break this.
                            const indexOf = (selector: string) =>
                                Math.max(0, (driverInstance.getConfig().steps ?? []).findIndex((step) => step.element === selector));
                            driverInstance.moveTo(indexOf('[data-tour="suggest-future-classes"]'));
                            setTimeout(() => {
                                driverInstance.destroy();
                                driverInstance.drive(indexOf('[data-tour="add-year"]'));
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
                element: '[data-tour="semester-planner"]',
                popover: {
                    title: 'Semester Planner',
                    description: 'Pick your class sections and build a weekly schedule for this semester.',
                    side: "left"
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
                element: '[data-tour="suggest-future-classes"]',
                popover: {
                    title: 'Suggest Future Classes',
                    description: 'Want to plan ahead? Pressing this will suggest the next courses to take (assuming you meet requirements of currently suggested ones)',
                    side: "top"
                },
                onDeselected: () => {
                    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }
            },
            {
                element: '[data-tour="save-plan"]',
                popover: {
                    title: 'Save Plan',
                    description: 'Once you\'r happy with your plan, you can save it. You\'ll also be reminded to save by a small yellow dot or if you close the tab without saving',
                    side: "top"
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
        ];

        allStepsRef.current = allSteps;

        const driverInstance = driver({
            showProgress: true,
            showButtons: ['next', 'previous', 'close'],
            steps: allSteps,
            onDestroyed: async () => {
                localStorage.setItem('hasSeenPlannerTutorial', 'true');
                dropdownWasOpenedRef.current = false;

                // CRUD Update
                const currentUser = userRef.current;
                if (currentUser?.uid) {
                    const token = await currentUser.getIdToken();
                    if (token) {
                        try {
                            const CRUD_API = import.meta.env.VITE_CRUD_API;
                            await fetch(CRUD_API, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    userId: currentUser.uid,
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

        const seenInStorage = localStorage.getItem('hasSeenPlannerTutorial');
        if (hasSeenTutorial && !seenInStorage) {
            localStorage.setItem('hasSeenPlannerTutorial', 'true');
        }

        if (!seenInStorage && !hasSeenTutorial) {
            setTimeout(async () => {
                await waitForVisible(PLAN_REC_SELECTOR, 2000);
                driverInstance.setSteps(activeSteps(allSteps));
                driverInstance.drive();
            }, 500);
        }

    }, []);

    const startTutorial = () => {
        if (!driverObj) return;
        driverObj.setSteps(activeSteps(allStepsRef.current));
        driverObj.drive();
    };

    return { driverObj, startTutorial, dropdownWasOpenedRef };
}