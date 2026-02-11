export interface Course {
    course_code: string;
    course_name: string;
    credits_attempted?: number;
    credits_earned?: number;
    credits_planned?: number;
    grade?: string;
    id?: string;
    status?: string;
    semester?: string;
    description?: string;
    code?: string;
    corequisites?: string[][];
    icon?: string | null;
};