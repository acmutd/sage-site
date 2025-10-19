import { AlertTriangle, Info, CheckCircle, GripVertical } from 'lucide-react';
import { useDrag } from "react-dnd";

interface CourseBoxProps {
    course: any;
    status?: 'default' | 'completed' | 'warning' | 'info';
    icon?: 'check' | 'warning' | 'info' | null;
    sourceYear?: string;
    sourceSemesterIndex?: number;
}

const CourseBox: React.FC<CourseBoxProps> = ({
    course,
    sourceYear,
    sourceSemesterIndex,
    status = 'default',
    icon = null
}) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: "COURSE",
        item: {
            course,
            sourceYear,
            sourceSemesterIndex,
            courseId: course.id
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    const getStatusStyles = () => {
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
                    {course.course_code || course.code || "Unknown Course"}
                </span>
            </div>
            <div className="flex items-center gap-2">
                {getIcon()}
            </div>
        </div>
    );
};

export default CourseBox;
