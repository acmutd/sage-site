import { useEffect, useRef, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { User } from "firebase/auth";

interface UseChatbotTutorialOptions {
    user: User | null | undefined;
}

export function useChatbotTutorial({ user }: UseChatbotTutorialOptions) {
    const [driverObj, setDriverObj] = useState<any>(null);
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    useEffect(() => {
        const driverInstance = driver({
            showProgress: true,
            showButtons: ['next', 'previous', 'close'],
            steps: [
                {
                    element: '[data-tour="sidebar"]',
                    popover: {
                        title: 'Conversation History',
                        description: 'View and manage your conversation history here. Click on any past conversation to continue it. Hovering over the conversation allows you to manage it.',
                        side: "right"
                    }
                },
                {
                    element: '[data-tour="new-chat-expanded"]',
                    popover: {
                        title: 'New Chat',
                        description: 'Start a fresh conversation with SAGE anytime.',
                        side: "bottom"
                    }
                },
                {
                    element: '[data-tour="sidebar-collapse"]',
                    popover: {
                        title: 'Collapse Sidebar',
                        description: 'You can collapse the sidebar to expand your chat view. Click again to reopen it.',
                        side: "bottom"
                    }
                },
                {
                    element: '[data-tour="chat-input"]',
                    popover: {
                        title: 'Ask Questions',
                        description: 'Type your questions here and press Enter or click the send button to your right.',
                        side: "top"
                    }
                },
                {
                    element: '[data-tour="mode-toggle"]',
                    popover: {
                        title: 'Mode Toggle',
                        description: 'Switch between general advising questions and schedule generation mode.',
                        side: "top"
                    }
                },
                {
                    element: '[data-tour="help-button"]',
                    popover: {
                        title: 'Tutorial',
                        description: 'Click here to replay the tutorial at any time',
                        side: "left"
                    }
                }
            ],
            onDestroyed: async () => {
                localStorage.setItem('hasSeenChatbotTutorial', 'true');

                // Sync to backend so tutorial state persists across devices
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
                                    tutorialName: 'hasSeenChatbotTutorial',
                                    seenStatus: true
                                }),
                            });
                        } catch (error) {
                            console.error('Failed to update chatbot tutorial status in cloud:', error);
                        }
                    }
                }
            },
            popoverClass: 'sage-driver-theme'
        });

        setDriverObj(driverInstance);

        const hasSeenTutorial = localStorage.getItem('hasSeenChatbotTutorial');
        if (!hasSeenTutorial) {
            setTimeout(() => driverInstance.drive(), 500);
        }
    }, []);

    const startTutorial = () => {
        if (driverObj) driverObj.drive();
    };

    return { driverObj, startTutorial };
}