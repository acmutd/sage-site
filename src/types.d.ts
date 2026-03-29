/* Contains information about a single chat message */
interface Message {
    /* Sender of the message */
    role: string;

    /* Content of the message */
    content: string;

    /* Timestamp the message was sent in epoch time */
    timestamp: number;

    /* What type of query is it? Tells us what frontend needs to do */ 
    type?: "email";

    /* If type is of email or choices, we get to choose */
    variants?: { label: string; subject: string; body: string }[];
}

interface Conversation {
    title?: string;
    conversation_id: string;
    messages: Message[];
    user_id: string;
}