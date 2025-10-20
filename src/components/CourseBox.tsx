import { AlertTriangle, Info, CheckCircle, GripVertical } from 'lucide-react';
import { useDrag } from "react-dnd";

interface CourseBoxProps {
    course: string | {
        code?: string;
        course_code?: string;
        name?: string;
        credits?: number;
        status?: string;
        semester?: string;
        id?: string;
    };
    status?: 'default' | 'completed' | 'warning' | 'info';
    icon?: 'check' | 'warning' | 'info' | null;
    sourceYear?: string;
    sourceSemesterIndex?: number;
    isSuggested?: boolean;
}

const CourseBox: React.FC<CourseBoxProps> = ({
    course,
    sourceYear,
    sourceSemesterIndex,
    status = 'default',
    icon = null,
    isSuggested = false
}) => {

    const courseData = typeof course === 'string'
        ? { code: course }
        : course;

    const [{ isDragging }, drag] = useDrag(() => ({
        type: "COURSE",
        item: {
            course: courseData,
            sourceYear,
            sourceSemesterIndex,
            courseId: courseData.id
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    const getStatusStyles = () => {
        if (isSuggested) {
            return 'border-yellow-300 bg-yellow-50'; // Yellow style for suggested courses
        }
        switch (status) {
            case 'completed':
                return 'border-green-300 bg-white';
            case 'warning':
                return 'border-yellow-400 bg-yellow-50';
            case 'info':
                return 'border-blue-300 bg-white';
            default:
                return 'border-gray-200 bg-white';
        }
    };

    const getIcon = () => {
        if (icon === 'check') return <CheckCircle className="w-4 h-4 text-green-500" />;
        if (icon === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
        if (icon === 'info') return <Info className="w-4 h-4 text-blue-500" />;
        return null;
    };

    return (
        <div
            ref={drag}
            className={`flex items-center justify-between p-3 rounded-lg border-2 ${getStatusStyles()} 
                transition-all hover:shadow-sm ${isDragging ? "opacity-50" : ""} 
                cursor-grab relative z-10`} // Added relative positioning, z-index, and cursor
        >
            <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 ml-1">
                    {courseData.code || courseData.course_code || "Unknown Course"}
                </span>
            </div>
            <div className="flex items-center gap-2">
                {getIcon()}
                {isSuggested && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                        Suggested
                    </span>
                )}
            </div>
        </div>
    );
};

export default CourseBox;
