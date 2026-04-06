
export interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    type?: "email" | "schedule";
    variants?: EmailVariant[] | ScheduleVariant[];
}

export interface Conversation {
    conversation_id: string;
    user_id: string;
    messages: Message[];
    title?: string;
    conversation_name?: string;
}

export interface CourseBlock {
    course: string;
    section: string;
    days: string[];
    start: number;
    end: number;
    prof: string;
    room: string;
}
  
export interface ScheduleVariant {
    label: string;
    reason: string;
    blocks: CourseBlock[];
}

export interface EmailVariant {
    label: string;
    subject: string;
    body: string;
  }