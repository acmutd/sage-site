import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, TriangleAlert, CheckCircle, Calendar, Plus, Trash2, SlidersHorizontal, ChevronDown, ChevronUp, CalendarDays, Download } from 'lucide-react';
import { exportAsPNG, exportAsJPG, exportAsPDF, exportAsICS, exportToGoogleCalendar, exportAsCSV } from '@/utils/scheduleExports';
import { Course } from '@/types/course';
import ReactDOM from 'react-dom';
import SemesterDatePickerPopover from './SemesterDatePickPopover';

interface Break {
    id: string;
    label: string;
    days: string[];
    startTime: string;
    endTime: string;
}

interface SchedulePlanningModalProps {
    title: string;
    courses: Course[];
    onClose: () => void;
    onSave?: (selectedSections: Record<string, string>, colorOverrides: Record<string, string>) => void;
    initialSelectedSections?: Record<string, string>;
    initialColorOverrides?: Record<string, string>;
    coursebookSemester?: string | null;
}

const DAY_ABBR: Record<string, string> = {
    Monday: "M", Tuesday: "Tu", Wednesday: "W", Thursday: "Th", Friday: "F", Saturday: "S"
};
const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT: Record<string, string> = {
    Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat"
};

// 7am to 10pm
const GRID_START = 7 * 60;
const GRID_END = 22 * 60;
const GRID_DURATION = GRID_END - GRID_START; // 900 min
const PX_PER_MIN = 1.4;
const GRID_HEIGHT = GRID_DURATION * PX_PER_MIN;

const COURSE_COLORS = [
    { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' }, // blue
    { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' }, // purple
    { bg: '#ffedd5', border: '#f97316', text: '#9a3412' }, // orange
    { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' }, // pink
    { bg: '#ccfbf1', border: '#14b8a6', text: '#0f766e' }, // teal
    { bg: '#fef9c3', border: '#eab308', text: '#854d0e' }, // yellow
    { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' }, // indigo
    { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' }, // red
];

// Given a hex border color, produce a light bg and dark text variant
const hexToColorSet = (hex: string): { bg: string; border: string; text: string } => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Mix with white instead of using rgba transparency
    const mix = (v: number) => Math.round(v * 0.15 + 255 * 0.85);
    const bg = `rgb(${mix(r)},${mix(g)},${mix(b)})`;
    
    const darken = (v: number) => Math.max(0, Math.round(v * 0.45));
    const text = `rgb(${darken(r)},${darken(g)},${darken(b)})`;
    return { bg, border: hex, text };
};

const SWATCH_COLORS = [
    '#3b82f6', '#8b5cf6', '#f97316', '#ec4899',
    '#14b8a6', '#eab308', '#6366f1', '#ef4444',
    '#10b981', '#f43f5e', '#0ea5e9', '#a855f7',
];

const ColorDotPicker = ({ color, onChange }: { color: string; onChange: (hex: string) => void }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div className="relative flex-shrink-0" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(p => !p)}
                className="w-2.5 h-2.5 rounded-full ring-1 ring-offset-1 ring-transparent hover:ring-gray-300 transition-all"
                style={{ backgroundColor: color }}
                title="Customize color"
            />
            {open && (
                <div className="absolute left-0 top-5 z-50 bg-white border border-gray-200 rounded-md shadow-lg p-2.5 w-[148px]"
                    onClick={e => e.stopPropagation()}>
                    <div className="grid grid-cols-6 gap-1 mb-2">
                        {SWATCH_COLORS.map(c => (
                            <button key={c} type="button"
                                onClick={() => { onChange(c); setOpen(false); }}
                                className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ring-1 ring-offset-1 ${color === c ? 'ring-gray-400' : 'ring-transparent'}`}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5 border-t border-gray-100 pt-2">
                        <label className="text-[10px] text-gray-400 flex-shrink-0">Custom</label>
                        <input
                            type="color"
                            value={color}
                            onChange={e => onChange(e.target.value)}
                            className="w-full h-6 rounded cursor-pointer border border-gray-200"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const getTime = (t: any) => (Array.isArray(t) ? t[0] : (t || '')).split(';')[0].trim();

const parseTime12 = (timeStr: string): { start: number; end: number } | null => {
    const raw = Array.isArray(timeStr) ? timeStr[0] : timeStr;
    if (!raw) return null;
    const trimmed = timeStr.split(';')[0].trim();
    const match = trimmed.match(/(\d+):(\d+)\s*(AM|PM)\s*[-–]\s*(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    const toMin = (h: string, m: string, ap: string) => {
        let hrs = parseInt(h);
        const mins = parseInt(m);
        if (ap.toUpperCase() === 'PM' && hrs !== 12) hrs += 12;
        if (ap.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
        return hrs * 60 + (mins || 0);
    };
    return {
        start: toMin(match[1], match[2], match[3]),
        end: toMin(match[4], match[5], match[6]),
    };
};

const parseTime24 = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
};

const parseDays = (days: string | string[]): Set<string> => {
    if (Array.isArray(days)) return new Set(days.map(d => d.trim()).filter(Boolean));
    return new Set(days.split(',').map(d => d.trim()).filter(Boolean));
};

const timesOverlap = (s1: number, e1: number, s2: number, e2: number) =>
    s1 < e2 && s2 < e1;

const sectionsConflict = (s1: any, s2: any, padding = 0): boolean => {
    if (!s1?.days || !s2?.days || !s1?.times_12h || !s2?.times_12h) return false;
    const days1 = parseDays(s1.days);
    const days2 = parseDays(s2.days);
    if (![...days1].some(d => days2.has(d))) return false;
    const t1 = parseTime12(s1.times_12h);
    const t2 = parseTime12(s2.times_12h);
    if (!t1 || !t2) return false;
    return timesOverlap(t1.start, t1.end + padding, t2.start, t2.end + padding);
};

const sectionConflictsWithBreak = (sec: any, brk: Break, padding = 0): boolean => {
    if (!sec?.days || !sec?.times_12h || brk.days.length === 0) return false;
    const secDays = parseDays(sec.days);
    if (!brk.days.some(d => secDays.has(d))) return false;
    const t = parseTime12(sec.times_12h);
    if (!t) return false;
    const bs = parseTime24(brk.startTime);
    const be = parseTime24(brk.endTime);
    return timesOverlap(t.start, t.end + padding, bs, be + padding);
};

const DayPips = ({ days }: { days: string }) => {
    const active = parseDays(days);
    return (
        <div className="flex gap-0.5">
            {ALL_DAYS.map(d => (
                <span key={d} className={`text-[9px] font-bold w-5 h-5 rounded-sm flex items-center justify-center
                    ${active.has(d) ? "bg-green-400 text-black" : "bg-gray-100 text-gray-400"}`}>
                    {DAY_ABBR[d]}
                </span>
            ))}
        </div>
    );
};

const DayToggle = ({ selected, onChange }: { selected: string[]; onChange: (days: string[]) => void }) => (
    <div className="flex gap-1">
        {ALL_DAYS.map(d => {
            const on = selected.includes(d);
            return (
                <button key={d} type="button"
                    onClick={() => onChange(on ? selected.filter(x => x !== d) : [...selected, d])}
                    className={`text-[10px] font-bold w-6 h-6 rounded transition-colors
                        ${on ? "bg-green-400 text-black" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                    {DAY_ABBR[d]}
                </button>
            );
        })}
    </div>
);

const MODALITY_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'online', label: 'Online' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'inperson', label: 'In Person' },
];

const SORT_OPTIONS = [
    { value: 'default', label: 'Default' },
    { value: 'professor', label: 'Professor' },
    { value: 'location', label: 'Location' },
];

const guessModality = (sec: any): 'online' | 'hybrid' | 'inperson' => {
    const loc = (sec.location || '').toLowerCase();
    const type = (sec.activity_type || '').toLowerCase();
    if (loc === 'online' || type.includes('online') || type.includes('distance')) return 'online';
    if (type.includes('hybrid')) return 'hybrid';
    return 'inperson';
};

const formatCoursebookSemester = (sem: string | null): string | null => {
    if (!sem) return null;
    const match = sem.match(/^(\d{2})([suf])$/);
    if (!match) return null;
    const year = `20${match[1]}`;
    const name = { s: "Spring", u: "Summer", f: "Fall" }[match[2]] ?? "";
    return `${name} ${year}`;
};

const SchedulePlanningModal: React.FC<SchedulePlanningModalProps> = ({ title, courses, onClose, onSave, initialSelectedSections, initialColorOverrides, coursebookSemester }) => {
    const [selectedSections, setSelectedSections] = useState<Record<string, string>>(initialSelectedSections ?? {});
    const [breaks, setBreaks] = useState<Break[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [showPreview, setShowPreview] = useState(window.innerWidth >= 640);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [sessionFilter, setSessionFilter] = useState<string>('all');
    const [modalityFilter, setModalityFilter] = useState<string>('all');
    const [professorFilters, setProfessorFilters] = useState<Record<string, string>>({});
    const [sortBy, setSortBy] = useState<string>('default');
    const [newBreak, setNewBreak] = useState<Omit<Break, 'id'>>({ label: '', days: [], startTime: '12:00', endTime: '13:00' });
    const [showBreakForm, setShowBreakForm] = useState(false);
    const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set());
    const [colorOverrides, setColorOverrides] = useState<Record<string, string>>(initialColorOverrides ?? {});
    const [classPadding, setClassPadding] = useState<number>(0);
    const [paddingUnit, setPaddingUnit] = useState<'min' | 'hr'>('min');
    const [customPadding, setCustomPadding] = useState<string>('');
    const [showDisclaimer, setShowDisclaimer] = useState(true);
    const [showDatePicker, setShowDatePicker] = useState<'ics' | 'gcal' | null>(null); // <-- added this because we need that session key passed from upstream
    const gridRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const gridInnerRef = useRef<HTMLDivElement>(null);

    const toggleCollapse = (code: string) =>
        setCollapsedCourses(prev => {
            const next = new Set(prev);
            next.has(code) ? next.delete(code) : next.add(code);
            return next;
        });

    // Close export menu on outside click
    useEffect(() => {
        if (!showExportMenu) return;
        const handler = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node))
                setShowExportMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showExportMenu]);

    const classPaddingMinutes = useMemo(() => {
        if (customPadding !== '') {
            const val = parseFloat(customPadding);
            if (!isNaN(val) && val >= 0)
                return paddingUnit === 'hr' ? Math.round(val * 60) : Math.round(val);
        }
        return classPadding;
    }, [customPadding, classPadding, paddingUnit]);

    const plannableCourses = useMemo(() => {
        return courses
            .filter(c => String(c.status || '').toLowerCase() !== 'completed')
            .map(c => ({
                course: c,
                sections: (c as any).sections as any[] || [],
            }));
    }, [courses]);

    // Assign a color to each course by index
    const courseColorMap = useMemo(() => {
        const map: Record<string, typeof COURSE_COLORS[0]> = {};
        plannableCourses.forEach(({ course }, i) => {
            const key = (course.course_code ?? '').replace(/\s+/g, '');
            const override = colorOverrides[key];
            map[key] = override ? hexToColorSet(override) : COURSE_COLORS[i % COURSE_COLORS.length];
        });
        return map;
    }, [plannableCourses, colorOverrides]);

    const allSessions = useMemo(() => {
        const s = new Set<string>();
        plannableCourses.forEach(({ sections }) =>
            sections.forEach((sec: any) => { if (sec.session) s.add(sec.session); })
        );
        return [...s].sort();
    }, [plannableCourses]);

    const filterAndSort = (sections: any[], courseCode: string) => {
        const profFilter = professorFilters[courseCode] ?? 'all';
        let result = sections.filter(sec => {
            if (sessionFilter !== 'all' && sec.session !== sessionFilter) return false;
            if (modalityFilter !== 'all' && guessModality(sec) !== modalityFilter) return false;
            if (profFilter !== 'all') {
                const profs = (Array.isArray(sec.instructors) ? sec.instructors : (sec.instructors || '').split(',')).map((p: string) => p.trim());
                if (!profs.includes(profFilter)) return false;
            }
            return true;
        });
        if (sortBy === 'professor') result = [...result].sort((a, b) => {
            const aProf = (Array.isArray(a.instructors) ? a.instructors.join(', ') : (a.instructors || ''));
            const bProf = (Array.isArray(b.instructors) ? b.instructors.join(', ') : (b.instructors || ''));
            return aProf.localeCompare(bProf);
        });
        
        else if (sortBy === 'location') result = [...result].sort((a, b) => {
            const aLoc = (Array.isArray(a.location) ? a.location.join(', ') : (a.location || ''));
            const bLoc = (Array.isArray(b.location) ? b.location.join(', ') : (b.location || ''));
            return aLoc.localeCompare(bLoc);
        });        
        
        return result;
    };

    const professorDropdownWidth = useMemo(() => {
        let maxLen = 'All Professors'.length;
        plannableCourses.forEach(({ sections }) =>
            sections.forEach((sec: any) => {
                const profs: string[] = Array.isArray(sec.instructors)
                    ? sec.instructors
                    : (sec.instructors || '').split(',');
                profs.forEach((p: string) => {
                    maxLen = Math.max(maxLen, p.trim().length);
                });
            })
        );
        return maxLen * 7 + 48;
    }, [plannableCourses]);

    const selectedSectionObjects = useMemo(() => {
        return plannableCourses
            .map(({ course, sections }) => {
                const key = selectedSections[course.course_code ?? ''];
                return key ? (sections.find((s: any) => s.section?.trim() === key) ?? null) : null;
            })
            .filter(Boolean);
    }, [plannableCourses, selectedSections]);

    const conflictPairs = useMemo(() => {
        const pairs: [any, any][] = [];
        for (let i = 0; i < selectedSectionObjects.length; i++)
            for (let j = i + 1; j < selectedSectionObjects.length; j++)
                if (sectionsConflict(selectedSectionObjects[i], selectedSectionObjects[j], classPaddingMinutes))
                    pairs.push([selectedSectionObjects[i], selectedSectionObjects[j]]);
        return pairs;
    }, [selectedSectionObjects, classPaddingMinutes]);

    const conflictingKeys = useMemo(() => {
        const keys = new Set<string>();
        conflictPairs.forEach(([a, b]) => {
            keys.add(`${a.course_prefix}${a.course_number}.${a.section?.trim()}`);
            keys.add(`${b.course_prefix}${b.course_number}.${b.section?.trim()}`);
        });
        return keys;
    }, [conflictPairs]);

    const breakConflictingKeys = useMemo(() => {
        const keys = new Set<string>();
        selectedSectionObjects.forEach((sec: any) => {
            if (breaks.some(brk => sectionConflictsWithBreak(sec, brk, classPaddingMinutes)))
                keys.add(`${sec.course_prefix}${sec.course_number}.${sec.section?.trim()}`);
        });
        return keys;
    }, [selectedSectionObjects, breaks, classPaddingMinutes]);

    const wouldConflict = (courseCode: string, sec: any): boolean => {
        const otherConflict = plannableCourses.some(({ course, sections }) => {
            if (course.course_code === courseCode) return false;
            const key = selectedSections[course.course_code ?? ''];
            if (!key) return false;
            const sel = sections.find((s: any) => s.section?.trim() === key);
            return sel ? sectionsConflict(sec, sel, classPaddingMinutes) : false;
        });
        if (otherConflict) return true;
        return breaks.some(brk => sectionConflictsWithBreak(sec, brk, classPaddingMinutes));
    };

    const addBreak = () => {
        if (!newBreak.startTime || !newBreak.endTime || newBreak.days.length === 0) return;
        setBreaks(prev => [...prev, { ...newBreak, id: crypto.randomUUID(), label: newBreak.label || 'Break' }]);
        setNewBreak({ label: '', days: [], startTime: '12:00', endTime: '13:00' });
        setShowBreakForm(false);
    };

    const allSelected = plannableCourses
        .filter(({ sections }) => sections.length > 0)
        .every(({ course }) => selectedSections[course.course_code ?? '']);

    const totalConflicts = conflictPairs.length + breakConflictingKeys.size;

    // Hour labels for the grid
    const hourLabels = Array.from({ length: 16 }, (_, i) => i + 7); // 7 to 22

    // exports
    const handleExportPNG = () => { setShowExportMenu(false); exportAsPNG(selectedSectionObjects, courseColorMap, title); };
    const handleExportJPG = () => { setShowExportMenu(false); exportAsJPG(selectedSectionObjects, courseColorMap, title); };
    const handleExportPDF = () => { setShowExportMenu(false); exportAsPDF(selectedSectionObjects, courseColorMap, title); };
    const handleExportCSV = () => { setShowExportMenu(false); exportAsCSV(selectedSectionObjects, title); };

    return ReactDOM.createPortal(
        <>
            <div className="fixed inset-0 bg-black bg-opacity-40 z-[9998]" />
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                    <div style={{ WebkitOverflowScrolling: 'touch' }} className={`bg-white sm:rounded-xl rounded-t-2xl shadow-2xl w-full h-[95dvh] sm:h-auto sm:max-h-[90vh] flex flex-col pointer-events-auto transition-all duration-300 ${showPreview ? 'sm:max-w-5xl' : 'sm:max-w-2xl'}`}>

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-green-500" />
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Schedule Planning</h2>
                                <p className="text-xs text-gray-500">{title}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Export dropdown */}
                            <div className="relative" ref={exportMenuRef}>
                                <button
                                    onClick={() => setShowExportMenu(p => !p)}
                                    disabled={selectedSectionObjects.length === 0}
                                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors
                                        ${showExportMenu ? 'bg-accent' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}
                                        disabled:opacity-40 disabled:cursor-not-allowed`}>
                                    <Download className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Export</span>
                                </button>
                                {showExportMenu && (
                                    <div className="absolute right-0 top-9 z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 w-48"
                                        onClick={e => e.stopPropagation()}>
                                        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Image</div>
                                        <button onClick={handleExportPNG} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">PNG</button>
                                        <button onClick={handleExportJPG} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">JPG</button>
                                        <button onClick={handleExportPDF} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">PDF</button>
                                        <div className="border-t border-gray-100 my-1" />
                                        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Calendar</div>
                                        <div className="relative">
                                            <button onClick={() => setShowDatePicker('ics')} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">iCal / ICS</button>
                                            <button onClick={() => setShowDatePicker('gcal')} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">Google Calendar</button>
                                            {showDatePicker && (
                                                <SemesterDatePickerPopover
                                                    onCancel={() => setShowDatePicker(null)}
                                                    onConfirm={(range) => {
                                                        if (showDatePicker === 'ics') exportAsICS(selectedSectionObjects, title, range);
                                                        else exportToGoogleCalendar(selectedSectionObjects, range);
                                                        setShowDatePicker(null);
                                                        setShowExportMenu(false);
                                                    }}
                                                    // Future: prefillRange={semesterDateRange} when session data exists
                                                />
                                            )}
                                        </div>
                                        <div className="border-t border-gray-100 my-1" />
                                        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Data</div>
                                        <button onClick={handleExportCSV} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">CSV</button>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setShowPreview(p => !p)}
                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors
                                    ${showPreview ? 'bg-accent' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                <CalendarDays className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Preview</span>
                            </button>
                            <button onClick={() => setShowFilters(p => !p)}
                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors
                                    ${showFilters ? 'bg-accent' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Filters</span>
                            </button>
                            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 flex-shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Filter bar */}
                    {showFilters && (
                        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex gap-4 items-end overflow-x-auto overflow-y-hidden flex-shrink-0">
                            <div className="flex flex-col gap-1 flex-shrink-0">
                                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Class Buffer</label>
                                <div className="flex gap-1 items-center">
                                    {[0, 5, 10, 15, 30].map(min => (
                                        <button key={min} onClick={() => { setClassPadding(min); setCustomPadding(''); }}
                                            className={`text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap
                                                ${classPadding === min && customPadding === '' ? 'bg-accent' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                            {min === 0 ? 'None' : `${min}m`}
                                        </button>
                                    ))}
                                    <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white">
                                        <input
                                            type="number" min="0" placeholder="Custom"
                                            value={customPadding}
                                            onChange={e => { setCustomPadding(e.target.value); setClassPadding(-1); }}
                                            className="text-xs w-14 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400" />
                                        <select
                                            value={paddingUnit}
                                            onChange={e => setPaddingUnit(e.target.value as 'min' | 'hr')}
                                            className="text-xs border-l border-gray-200 px-1.5 py-1 bg-white appearance-none focus:outline-none focus:ring-1 focus:ring-green-400">
                                            <option value="min">min</option>
                                            <option value="hr">hr</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            {allSessions.length > 0 && (
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Session</label>
                                    <div className="relative">
                                        <select value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}
                                            className="text-xs border border-gray-200 rounded-md px-2.5 py-1.5 pr-7 bg-white appearance-none focus:outline-none focus:ring-1 focus:ring-green-400">
                                            <option value="all">All Sessions</option>
                                            {allSessions.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col gap-1 flex-shrink-0">
                                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Modality</label>
                                <div className="flex gap-1">
                                    {MODALITY_OPTIONS.map(opt => (
                                        <button key={opt.value} onClick={() => setModalityFilter(opt.value)}
                                            className={`text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap
                                                ${modalityFilter === opt.value ? 'bg-accent' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 flex-shrink-0">
                                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Sort by</label>
                                <div className="flex gap-1">
                                    {SORT_OPTIONS.map(opt => (
                                        <button key={opt.value} onClick={() => setSortBy(opt.value)}
                                            className={`text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap
                                                ${sortBy === opt.value ? 'bg-accent' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Status bar */}
                    {(allSelected || totalConflicts > 0) && (
                        <div className={`px-5 py-2 text-xs font-medium flex items-center gap-2 border-b flex-shrink-0
                            ${totalConflicts > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                            {totalConflicts > 0 ? (
                                <><TriangleAlert className="w-3.5 h-3.5 flex-shrink-0" />
                                    {totalConflicts} conflict{totalConflicts > 1 ? 's' : ''} detected — adjust selections below</>
                            ) : (
                                <><CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />All sections selected — no conflicts!</>
                            )}
                        </div>
                    )}

                    {/* Main content area - row layout */}
                    <div className="flex flex-row flex-1 overflow-hidden">

                        {/* Left: picker */}
                        <div className={`flex-1 overflow-y-auto divide-y divide-gray-100 min-w-0 ${showPreview ? 'hidden sm:block' : ''}`}>

                            {/* Breaks */}
                            <div className="px-5 py-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">My Breaks</span>
                                    <button onClick={() => setShowBreakForm(p => !p)}
                                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium">
                                        <Plus className="w-3.5 h-3.5" /> Add Break
                                    </button>
                                </div>

                                {breaks.length === 0 && !showBreakForm && (
                                    <p className="text-xs text-gray-400 italic">No breaks added — sections overlapping breaks will be flagged.</p>
                                )}

                                {breaks.map(brk => (
                                    <div key={brk.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2 mb-1.5 gap-3">
                                        <DayToggle selected={brk.days}
                                            onChange={days => setBreaks(prev => prev.map(b => b.id === brk.id ? { ...b, days } : b))} />
                                        <span className="text-xs font-medium text-gray-700 flex-1">{brk.label}</span>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">{brk.startTime} – {brk.endTime}</span>
                                        <button onClick={() => setBreaks(prev => prev.filter(b => b.id !== brk.id))}
                                            className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}

                                {showBreakForm && (
                                    <div className="bg-white border border-gray-200 rounded-md px-3 py-3 mt-2 space-y-2.5">
                                        <input type="text" placeholder="Label (e.g. Lunch)"
                                            value={newBreak.label}
                                            onChange={e => setNewBreak(p => ({ ...p, label: e.target.value }))}
                                            className="w-full text-xs border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-400" />
                                        <DayToggle selected={newBreak.days}
                                            onChange={days => setNewBreak(p => ({ ...p, days }))} />
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] text-gray-400">Start</label>
                                                <input type="time" value={newBreak.startTime}
                                                    onChange={e => setNewBreak(p => ({ ...p, startTime: e.target.value }))}
                                                    className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400" />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] text-gray-400">End</label>
                                                <input type="time" value={newBreak.endTime}
                                                    onChange={e => setNewBreak(p => ({ ...p, endTime: e.target.value }))}
                                                    className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400" />
                                            </div>
                                            <div className="flex gap-1.5 self-end">
                                                <button onClick={addBreak}
                                                    className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 font-medium">
                                                    Add
                                                </button>
                                                <button onClick={() => setShowBreakForm(false)}
                                                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200">
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Courses */}
                            {plannableCourses.length === 0 && (
                                <div className="py-12 text-center text-sm text-gray-400">No courses to plan.</div>
                            )}

                            {plannableCourses.map(({ course, sections }) => {
                                const code = course.course_code ?? '';
                                const selectedKey = selectedSections[code];
                                const filtered = filterAndSort(sections, code);
                                const colorKey = code.replace(/\s+/g, '');
                                const courseColor = courseColorMap[colorKey];

                                const courseProfessors = [...new Set(
                                    sections.flatMap((sec: any) =>
                                        (Array.isArray(sec.instructors) ? sec.instructors : (sec.instructors || '').split(',')).map((p: string) => p.trim()).filter(Boolean)
                                    )
                                )].sort();

                                return (
                                    <div key={code} className="px-5 py-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <button onClick={() => toggleCollapse(code)} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                                                    <ChevronUp className={`w-4 h-4 transition-transform ${collapsedCourses.has(code) ? '-rotate-180' : ''}`} />
                                                </button>
                                                {courseColor && (
                                                    <ColorDotPicker
                                                        color={courseColor.border}
                                                        onChange={hex => setColorOverrides(prev => ({ ...prev, [colorKey]: hex }))}
                                                    />
                                                )}
                                                <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{code}</span>
                                                {course.course_name && (
                                                    <span className="text-xs text-gray-500 truncate hidden sm:block">{course.course_name}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {courseProfessors.length > 1 && (
                                                    <div className="relative">
                                                        <select
                                                            value={professorFilters[code] ?? 'all'}
                                                            onChange={e => setProfessorFilters(prev => ({ ...prev, [code]: e.target.value }))}
                                                            style={{ width: window.innerWidth >= 640 ? `${professorDropdownWidth}px` : undefined }}
                                                            className="text-xs border border-gray-200 rounded-md px-2.5 py-1 pr-7 bg-white appearance-none focus:outline-none focus:ring-1 focus:ring-green-400 max-w-[120px] sm:max-w-none">
                                                            <option value="all">All Professors</option>
                                                            {courseProfessors.map(p => <option key={p} value={p}>{p}</option>)}
                                                        </select>
                                                        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                    </div>
                                                )}
                                                {selectedKey && (
                                                    <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-medium whitespace-nowrap hidden sm:block">
                                                        {code}.{selectedKey} selected
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {selectedKey && (
                                            <div className="sm:hidden mb-2">
                                                <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-medium">
                                                    {code}.{selectedKey} selected
                                                </span>
                                            </div>
                                        )}

                                        {!collapsedCourses.has(code) && (
                                            filtered.length === 0 ? (
                                                <p className="text-xs text-gray-400 italic">
                                                    {sections.length === 0 ? 'No section data available' : 'No sections match current filters'}
                                                </p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {filtered.map((sec: any, i: number) => {
                                                        const secKey = sec.section?.trim();
                                                        const isSelected = selectedKey === secKey;
                                                        const sectionId = `${sec.course_prefix}${sec.course_number}.${secKey}`;
                                                        const isConflictingSelected = isSelected && (conflictingKeys.has(sectionId) || breakConflictingKeys.has(sectionId));
                                                        const wouldConflictIfSelected = !isSelected && wouldConflict(code, sec);
                                                        const modality = guessModality(sec);

                                                        return (
                                                            <label key={i} className={`
                                                                flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-all
                                                                ${isConflictingSelected
                                                                    ? 'border-red-400 bg-red-50'
                                                                    : isSelected
                                                                        ? 'border-green-400 bg-green-50'
                                                                        : wouldConflictIfSelected
                                                                            ? 'border-orange-200 bg-orange-50 opacity-70'
                                                                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}
                                                            `}>
                                                                <input type="radio" name={code} value={secKey} checked={isSelected}
                                                                    onChange={() => setSelectedSections(prev => ({ ...prev, [code]: secKey }))}
                                                                    style={{ accentColor: '#22c55e' }}
                                                                    className="flex-shrink-0" />

                                                                <div className="flex-1 min-w-0 text-xs">
                                                                    {/* Mobile: 2-row layout */}
                                                                    <div className="sm:hidden">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="font-semibold text-gray-800">
                                                                                {sec.course_prefix?.toUpperCase()} {sec.course_number}.{secKey}
                                                                            </span>
                                                                            <span className="text-gray-400">#{sec.class_number}</span>
                                                                            {sec.session && <span className="text-[10px] text-blue-500">{sec.session}</span>}
                                                                            <span className="text-gray-500">·</span>
                                                                            <span className="font-medium text-gray-700 truncate">
                                                                                {(() => {
                                                                                    const instList = Array.isArray(sec.instructors)
                                                                                        ? sec.instructors
                                                                                        : (sec.instructors || '').split(',').map((p: string) => p.trim()).filter(Boolean);
                                                                                    return instList.length > 0 ? `${instList[0]}${instList.length > 1 ? ' +' : ''}` : '';
                                                                                })()}
                                                                            </span>
                                                                            <span className="text-gray-400">{sec.activity_type}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                            {sec.days && <DayPips days={sec.days} />}
                                                                            <span className="text-gray-500">{getTime(sec.times_12h)}</span>
                                                                            <span className="text-gray-300">·</span>
                                                                            <span className={`font-medium ${modality === 'online' ? 'text-green-600' : 'text-gray-600'}`}>
                                                                                {sec.location?.replace('_', ' ')}
                                                                            </span>
                                                                            <span className={`text-[10px] font-medium
                                                                                ${modality === 'online' ? 'text-green-500' : modality === 'hybrid' ? 'text-blue-500' : 'text-gray-400'}`}>
                                                                                {modality === 'online' ? 'Online' : modality === 'hybrid' ? 'Hybrid' : 'In Person'}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Desktop: original 4-column grid */}
                                                                    <div className="hidden sm:grid gap-2 items-center"
                                                                        style={{ gridTemplateColumns: '100px 1fr 1fr 70px' }}>
                                                                        <div>
                                                                            <div className="font-semibold text-gray-800">
                                                                                {sec.course_prefix?.toUpperCase()} {sec.course_number}.{secKey}
                                                                            </div>
                                                                            <div className="text-gray-400">#{sec.class_number}</div>
                                                                            {sec.session && <div className="text-[10px] text-blue-500 mt-0.5">{sec.session}</div>}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="font-medium text-gray-700 truncate">
                                                                                {(() => {
                                                                                    const profs = Array.isArray(sec.instructors)
                                                                                        ? sec.instructors
                                                                                        : (sec.instructors || '').split(',').map((p: string) => p.trim()).filter(Boolean);
                                                                                    return profs.length > 0 ? `${profs[0]}${profs.length > 1 ? ' +' : ''}` : '';
                                                                                })()}
                                                                            </div>
                                                                            <div className="text-gray-400">{sec.activity_type}</div>
                                                                        </div>
                                                                        <div className="flex flex-col gap-1">
                                                                            {sec.days && <DayPips days={sec.days} />}
                                                                            <span className="text-gray-500">{getTime(sec.times_12h)}</span>
                                                                        </div>
                                                                        <div>
                                                                            <div className={`truncate font-medium ${modality === 'online' ? 'text-green-600' : 'text-gray-600'}`}>
                                                                                {sec.location?.replace('_', ' ')}
                                                                            </div>
                                                                            <div className={`text-[10px] mt-0.5 font-medium
                                                                                ${modality === 'online' ? 'text-green-500' : modality === 'hybrid' ? 'text-blue-500' : 'text-gray-400'}`}>
                                                                                {modality === 'online' ? 'Online' : modality === 'hybrid' ? 'Hybrid' : 'In Person'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <TriangleAlert className={`w-3.5 h-3.5 flex-shrink-0
                                                                    ${isConflictingSelected
                                                                        ? 'text-red-500'
                                                                        : wouldConflictIfSelected
                                                                            ? 'text-orange-400'
                                                                            : 'invisible'}`} />
                                                                
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Right: weekly preview*/}
                        {showPreview && (
                            <div ref={gridRef} className="flex-1 sm:flex-none sm:w-[460px] flex-shrink-0 border-l border-gray-200 flex flex-col overflow-visible bg-white">
                                {/* Day headers - sticky */}
                                <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
                                    <div className="flex">
                                        <div className="w-8 flex-shrink-0" /> {/* time gutter */}
                                        {ALL_DAYS.map(d => (
                                            <div key={d} className="flex-1 text-center text-[10px] font-semibold text-gray-500 py-2 uppercase tracking-wide">
                                                {DAY_SHORT[d]}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Scrollable grid */}
                                <div className="overflow-y-auto flex-1">
                                    <div ref={gridInnerRef} className="flex" style={{ height: GRID_HEIGHT }}>
                                        {/* Time gutter */}
                                        <div className="w-8 flex-shrink-0 relative">
                                            {hourLabels.map(h => (
                                                <div key={h}
                                                    style={{ position: 'absolute', top: (h * 60 - GRID_START) * PX_PER_MIN - 6 }}
                                                    className="text-[8px] text-gray-400 w-full text-right pr-1 leading-none">
                                                    {h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Day columns */}
                                        {ALL_DAYS.map(day => (
                                            <div key={day} className="flex-1 relative border-l border-gray-100">
                                                {/* Hour lines */}
                                                {hourLabels.map(h => (
                                                    <div key={h}
                                                    style={{ position: 'absolute', top: (h * 60 - GRID_START) * PX_PER_MIN, left: 0, right: 0 }}
                                                    className="border-t border-gray-200" /> 
                                                ))}

                                                {/* Break blocks */}
                                                {breaks.map(brk => {
                                                    if (!brk.days.includes(day)) return null;
                                                    const bs = parseTime24(brk.startTime);
                                                    const be = parseTime24(brk.endTime);
                                                    if (bs >= GRID_END || be <= GRID_START) return null;
                                                    const top = (Math.max(bs, GRID_START) - GRID_START) * PX_PER_MIN;
                                                    const height = (Math.min(be, GRID_END) - Math.max(bs, GRID_START)) * PX_PER_MIN;
                                                    return (
                                                        <div key={brk.id}
                                                            style={{ position: 'absolute', top, height, left: 1, right: 1, backgroundColor: '#f3f4f6', borderLeft: '2px solid #9ca3af' }}
                                                            className="rounded-sm overflow-visible">
                                                            <div className="text-[8px] text-gray-400 font-medium px-1 mt-0.5 truncate">{brk.label}</div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Section blocks */}
                                                {selectedSectionObjects.map((sec: any) => {
                                                    const secDays = parseDays(sec.days || '');
                                                    if (!secDays.has(day)) return null;
                                                    const t = parseTime12(sec.times_12h);
                                                    if (!t) return null;
                                                    if (t.start >= GRID_END || t.end <= GRID_START) return null;
                                                    const top = (Math.max(t.start, GRID_START) - GRID_START) * PX_PER_MIN;
                                                    const height = (Math.min(t.end, GRID_END) - Math.max(t.start, GRID_START)) * PX_PER_MIN;
                                                    const colorKey = `${sec.course_prefix?.toUpperCase()}${sec.course_number}`;
                                                    const color = courseColorMap[colorKey] || COURSE_COLORS[0];
                                                    const sectionId = `${sec.course_prefix}${sec.course_number}.${sec.section?.trim()}`;
                                                    const hasConflict = conflictingKeys.has(sectionId) || breakConflictingKeys.has(sectionId);

                                                    return (
                                                        <div key={`${sec.section}-${day}`}
                                                            style={{
                                                                position: 'absolute', top, height, left: 1, right: 1,
                                                                backgroundColor: hasConflict ? '#fee2e2' : color.bg,
                                                                borderLeft: `2px solid ${hasConflict ? '#ef4444' : color.border}`,
                                                                borderRadius: '5px',
                                                                
                                                            }}
                                                            className="rounded-sm px-1 pt-1.5">
                                                            {/* NO overflow-hidden anywhere on the container */}
                                                            <div style={{ color: hasConflict ? '#991b1b' : color.text }}
                                                                className="text-[11px] font-bold truncate">
                                                                {sec.course_prefix?.toUpperCase()} {sec.course_number}
                                                            </div>
                                                            {height > 18 && (
                                                                <div style={{ color: hasConflict ? '#991b1b' : color.text }}
                                                                    className="text-[10px] opacity-75 truncate">
                                                                    {sec.location?.replace('_', ' ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Disclaimer */}
                    {showDisclaimer && (
                        <div className="px-5 py-2 bg-amber-50 border-t border-amber-100 flex-shrink-0 flex items-center justify-between gap-3">
                            <p className="text-[10px] text-amber-700 leading-relaxed">
                                Section availability is not real-time and is subject to change.
                                {coursebookSemester && ` Currently showing ${formatCoursebookSemester(coursebookSemester)} sections; course offerings may be limited.`}
                                {" "}Always verify openings in your university's official schedule planner before registering.
                            </p>
                            <button onClick={() => setShowDisclaimer(false)} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-xl flex-shrink-0">
                        <p className="text-xs text-gray-500">
                            {Object.keys(selectedSections).length} of{' '}
                            {plannableCourses.filter(p => p.sections.length > 0).length} courses with a section picked
                        </p>
                        <button onClick={() => { onSave?.(selectedSections, colorOverrides); onClose(); }}
                            className="px-4 py-1.5 text-sm bg-accent rounded-md hover:bg-green-800 transition-colors">
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