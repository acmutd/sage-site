import React, { useState, useMemo } from 'react';
import { X, TriangleAlert, CheckCircle, Calendar } from 'lucide-react';
import { Course } from '@/types/course';
import ReactDOM from 'react-dom';

interface SchedulePlanningModalProps {
    title: string;
    courses: Course[];
    onClose: () => void;
}

const DAY_ABBR: Record<string, string> = {
    Monday: "M", Tuesday: "Tu", Wednesday: "W", Thursday: "Th", Friday: "F"
};

const parseTime = (timeStr: string): { start: number; end: number } | null => {
    const trimmed = timeStr.split(';')[0].trim();
    const match = trimmed.match(/(\d+):(\d+)\s*(AM|PM)\s*[-–]\s*(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;

    const toMinutes = (h: string, m: string, ampm: string) => {
        let hours = parseInt(h);
        const mins = parseInt(m);
        if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
        return hours * 60 + mins;
    };

    return {
        start: toMinutes(match[1], match[2], match[3]),
        end: toMinutes(match[4], match[5], match[6]),
    };
};

const parseDays = (days: string): Set<string> =>
    new Set(days.split(',').map(d => d.trim()).filter(Boolean));

const sectionsConflict = (s1: any, s2: any): boolean => {
    if (!s1?.days || !s2?.days || !s1?.times_12h || !s2?.times_12h) return false;
    const days1 = parseDays(s1.days);
    const days2 = parseDays(s2.days);
    const sharedDay = [...days1].some(d => days2.has(d));
    if (!sharedDay) return false;
    const t1 = parseTime(s1.times_12h);
    const t2 = parseTime(s2.times_12h);
    if (!t1 || !t2) return false;
    return t1.start < t2.end && t2.start < t1.end;
};

const DayPips = ({ days }: { days: string }) => {
    const active = parseDays(days);
    return (
        <div className="flex gap-0.5">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(d => (
                <span key={d} className={`
                    text-[9px] font-bold w-5 h-5 rounded-sm flex items-center justify-center
                    ${active.has(d) ? "bg-green-400 text-black" : "bg-gray-100 text-gray-400"}
                `}>
                    {DAY_ABBR[d]}
                </span>
            ))}
        </div>
    );
};

const SchedulePlanningModal: React.FC<SchedulePlanningModalProps> = ({
    title,
    courses,
    onClose,
}) => {
    const [selectedSections, setSelectedSections] = useState<Record<string, string>>({});

    const plannableCourses = useMemo(() => {
        return courses
            .filter(c => String(c.status || '').toLowerCase() !== 'completed')
            .map(c => {
                const sections: any[] = (c as any).sections || [];
                return { course: c, sections };
            });
    }, [courses]);

    // Build list of all currently selected section objects
    const selectedSectionObjects = useMemo(() => {
        return plannableCourses
            .map(({ course, sections }) => {
                const code = course.course_code ?? '';
                const secKey = selectedSections[code];
                if (!secKey) return null;
                return sections.find(s => s.section?.trim() === secKey) ?? null;
            })
            .filter(Boolean);
    }, [plannableCourses, selectedSections]);

    // Detect conflicts among selected sections
    const conflictPairs = useMemo(() => {
        const pairs: [any, any][] = [];
        for (let i = 0; i < selectedSectionObjects.length; i++) {
            for (let j = i + 1; j < selectedSectionObjects.length; j++) {
                if (sectionsConflict(selectedSectionObjects[i], selectedSectionObjects[j])) {
                    pairs.push([selectedSectionObjects[i], selectedSectionObjects[j]]);
                }
            }
        }
        return pairs;
    }, [selectedSectionObjects]);

    const conflictingSectionKeys = useMemo(() => {
        const keys = new Set<string>();
        conflictPairs.forEach(([a, b]) => {
            keys.add(`${a.course_prefix}${a.course_number}.${a.section?.trim()}`);
            keys.add(`${b.course_prefix}${b.course_number}.${b.section?.trim()}`);
        });
        return keys;
    }, [conflictPairs]);

    const isSectionConflicting = (sec: any) => {
        const key = `${sec.course_prefix}${sec.course_number}.${sec.section?.trim()}`;
        return conflictingSectionKeys.has(key);
    };

    // Does this specific section conflict with any currently selected other section?
    const wouldConflict = (courseCode: string, sec: any): boolean => {
        return plannableCourses.some(({ course, sections }) => {
            if (course.course_code === courseCode) return false;
            const selectedKey = selectedSections[course.course_code ?? ''];
            if (!selectedKey) return false;
            const selectedSec = sections.find(s => s.section?.trim() === selectedKey);
            if (!selectedSec) return false;
            return sectionsConflict(sec, selectedSec);
        });
    };

    const allSelected = plannableCourses
        .filter(({ sections }) => sections.length > 0)
        .every(({ course }) => selectedSections[course.course_code ?? '']);

    const hasConflicts = conflictPairs.length > 0;

    return ReactDOM.createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-40 z-[9998]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col pointer-events-auto"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-green-500" />
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Schedule Planning</h2>
                                <p className="text-xs text-gray-500">{title}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Status bar */}
                    {(allSelected || hasConflicts) && (
                        <div className={`px-5 py-2.5 text-xs font-medium flex items-center gap-2 border-b ${
                            hasConflicts
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-green-50 border-green-200 text-green-700'
                        }`}>
                            {hasConflicts ? (
                                <>
                                    <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0" />
                                    {conflictPairs.length} time conflict{conflictPairs.length > 1 ? 's' : ''} detected — adjust your selections below
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    All sections selected — no conflicts!
                                </>
                            )}
                        </div>
                    )}

                    {/* Course list */}
                    <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                        {plannableCourses.length === 0 && (
                            <div className="py-12 text-center text-sm text-gray-400">
                                No courses to plan for this semester.
                            </div>
                        )}

                        {plannableCourses.map(({ course, sections }) => {
                            const code = course.course_code ?? '';
                            const selectedKey = selectedSections[code];

                            return (
                                <div key={code} className="px-5 py-4">
                                    {/* Course header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <span className="text-sm font-semibold text-gray-900">{code}</span>
                                            {course.course_name && (
                                                <span className="text-xs text-gray-500 ml-2">{course.course_name}</span>
                                            )}
                                        </div>
                                        {selectedKey && (
                                            <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                                {code}.{selectedKey} selected
                                            </span>
                                        )}
                                    </div>

                                    {sections.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No section data available</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {sections.map((sec: any, i: number) => {
                                                const secKey = sec.section?.trim();
                                                const isSelected = selectedKey === secKey;
                                                const conflicts = wouldConflict(code, sec);
                                                const isConflictingSelected = isSelected && isSectionConflicting(sec);

                                                return (
                                                    <label
                                                        key={i}
                                                        className={`
                                                            flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all
                                                            ${isSelected && isConflictingSelected
                                                                ? 'border-red-400 bg-red-50'
                                                                : isSelected
                                                                    ? 'border-green-400 bg-green-50'
                                                                    : conflicts
                                                                        ? 'border-orange-200 bg-orange-50 opacity-70'
                                                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                                            }
                                                        `}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={code}
                                                            value={secKey}
                                                            checked={isSelected}
                                                            onChange={() =>
                                                                setSelectedSections(prev => ({
                                                                    ...prev,
                                                                    [code]: secKey,
                                                                }))
                                                            }
                                                            className="accent-green-500 flex-shrink-0"
                                                        />

                                                        {/* Section info */}
                                                        <div className="flex-1 min-w-0 grid grid-cols-[100px_1fr_1fr_60px] gap-2 items-center text-xs">
                                                            {/* Section ID */}
                                                            <div>
                                                                <div className="font-semibold text-gray-800">
                                                                    {sec.course_prefix?.toUpperCase()} {sec.course_number}.{secKey}
                                                                </div>
                                                                <div className="text-gray-400">#{sec.class_number}</div>
                                                            </div>

                                                            {/* Instructor */}
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-gray-700 truncate">
                                                                    {sec.instructors?.split(',')[0].trim()}
                                                                    {sec.instructors?.includes(',') ? ' +' : ''}
                                                                </div>
                                                                <div className="text-gray-400">{sec.activity_type}</div>
                                                            </div>

                                                            {/* Schedule */}
                                                            <div className="flex flex-col gap-1">
                                                                {sec.days && <DayPips days={sec.days} />}
                                                                <span className="text-gray-500">
                                                                    {sec.times_12h?.split(';')[0].trim()}
                                                                </span>
                                                            </div>

                                                            {/* Room */}
                                                            <div className={`truncate font-medium ${
                                                                sec.location === 'Online'
                                                                    ? 'text-green-600'
                                                                    : 'text-gray-600'
                                                            }`}>
                                                                {sec.location?.replace('_', ' ')}
                                                            </div>
                                                        </div>

                                                        {/* Conflict badge */}
                                                        {(isConflictingSelected || (!isSelected && conflicts)) && (
                                                            <TriangleAlert className={`w-3.5 h-3.5 flex-shrink-0 ${
                                                                isConflictingSelected ? 'text-red-500' : 'text-orange-400'
                                                            }`} />
                                                        )}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-xl">
                        <p className="text-xs text-gray-500">
                            {Object.keys(selectedSections).length} of{' '}
                            {plannableCourses.filter(p => p.sections.length > 0).length} courses with a section picked
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

export default SchedulePlanningModal;