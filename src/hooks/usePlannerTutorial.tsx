import { useEffect, useRef, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { User } from "firebase/auth";

interface UsePlannerTutorialOptions {
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    user: User | null | undefined;
}

export function usePlannerTutorial({ scrollContainerRef, user }: UsePlannerTutorialOptions) {
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
                                driverInstance.moveTo(17);
                                setTimeout(() => {
                                    driverInstance.destroy();
                                    driverInstance.drive(16);
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
            ],
            onDestroyed: async () => {
                localStorage.setItem('hasSeenPlannerTutorial', 'true');
                dropdownWasOpenedRef.current = false;

                // CRUD Update
                if (user?.uid) {
                    const token = await user.getIdToken();
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

    return { driverObj, startTutorial, dropdownWasOpenedRef };
}
