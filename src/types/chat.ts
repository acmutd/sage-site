
export interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    type?: "email";
    variants?: { label: string; subject: string; body: string }[];
}

export interface Conversation {
conversation_id: string;
user_id: string;
messages: Message[];
title?: string;
conversation_name?: string;
}