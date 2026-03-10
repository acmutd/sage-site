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
    
    // coursebook fields
    instructors?: string;
    enrolled_status?: string;
    enrolled_current?: string;
    enrolled_max?: string;
    days?: string;
    times_12h?: string;
    location?: string;
    activity_type?: string;
    syllabus?: string;
    section?: string;
    sections?: any[];
    class_number?: string;
}