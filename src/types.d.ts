/* Contains information about a single chat message */
interface Message {
    /* Sender of the message */
    role: string;

    /* Content of the message */
    content: string;

    /* Timestamp the message was sent in epoch time */
    timestamp: number;
}

interface Conversation {
    title?: string;
    conversation_id: string;
    messages: Message[];
    user_id: string;
}