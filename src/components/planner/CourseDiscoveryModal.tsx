import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Fuse from 'fuse.js';
import {
    X, Search, Compass, ShoppingCart, ChevronRight, ChevronDown,
    Star, BookOpen, MapPin, ExternalLink, Plus, Minus,
    CheckCircle, AlertCircle, ArrowRight, Trash2, SlidersHorizontal,
    FileText, Clock, Award, RefreshCw, Layers, Loader2,
    ChevronUp
} from 'lucide-react';
import { getCoursePrerequisiteGroups, getMissingPrerequisiteGroups, normalizeCourseCode } from '@/utils/prerequisiteUtils';
import { getCurrentCatalogYear } from '@/utils/studentInfo';
import { usePlannerStore, StagedCourse } from "@/stores/plannerStore";

export interface DiscoverySection {
    section: string;
    class_number: string;
    instructors: string;
    days: string | string[];
    times_12h: string;
    location: string;
    activity_type?: string;
    enrolled_current?: number;
    enrolled_max?: number;
    enrolled_status?: string;
    syllabus?: string;
}

export interface DiscoveryCourse {
    course_id: string;
    course_code: string;
    course_name: string;
    description?: string;
    school: string;
    department: string;
    subject: string;
    subject_prefix: string;
    satisfies_core: boolean;
    credits: number;
    avg_grade?: string;
    grade_score?: number;
    avg_rating?: number;
    rating_count?: number;
    prereqs_met: boolean;
    prereqs_text?: string;
    coreqs_text?: string;
    instructor_permission?: boolean;
    standing_requirement?: string;
    gpa_requirement?: string;
    major_restriction?: string;
    aleks_score?: string;
    placement_exam?: boolean;
    equivalent?: string;
    max_repeat_credits?: number;
    footnote?: string;
    group_type?: string;
    catalog_year?: string;
    syllabus_url?: string;
    sections: DiscoverySection[];
    top_professors?: { name: string; avg_gpa: number; rating: number }[];
    prereqs_raw?: any;
}

export interface CartItem {
    course: DiscoveryCourse;
    pinned_section?: string;
}

export interface CourseDiscoveryModalProps {
    onClose: () => void;
    onAddToPlan: (items: CartItem[]) => void;
    semester?: string;
    cart: CartItem[];
    onCartChange: (cart: CartItem[]) => void;
    semesters: Record<string, { title: string; courses: any[]; isFromTranscript?: boolean; isLocked?: boolean }[]>;
    dropCourse: (params: any) => { success: boolean; error?: string };
    apiBaseUrl: string;
    getAuthToken: () => Promise<string>
    educationLevel?: 'undergraduate' | 'graduate';
    completedCourseCodes?: string[];
}

const LIMIT = 20;

const GRADE_ORDER: Record<string, number> = {
    'A+': 4.3, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0, 'F': 0,
};

const gradeColor = (g: string | undefined) => {
    const s = GRADE_ORDER[g ?? ''] ?? 0;
    if (s >= 3.7) return { bg: 'bg-green-100', text: 'text-green-700' };
    if (s >= 3.0) return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    if (s >= 2.0) return { bg: 'bg-orange-100', text: 'text-orange-700' };
    return { bg: 'bg-red-100', text: 'text-red-700' };
};

const modalityFromSection = (sec: DiscoverySection): 'online' | 'hybrid' | 'inperson' => {
    const loc = (sec.location || '').toLowerCase();
    if (loc === 'online' || loc === 'internet') return 'online';
    if (loc.includes('hybrid')) return 'hybrid';
    return 'inperson';
};

const modalityBadge = (m: 'online' | 'hybrid' | 'inperson') => {
    if (m === 'online') return 'text-blue-600 bg-blue-50';
    if (m === 'hybrid') return 'text-purple-600 bg-purple-50';
    return 'text-gray-500 bg-gray-100';
};

const modalityLabel = (m: 'online' | 'hybrid' | 'inperson') => {
    if (m === 'online') return 'Online';
    if (m === 'hybrid') return 'Hybrid';
    return 'In Person';
};

const normalizeDays = (days: string | string[]): string => {
    if (!days) return '';
    if (Array.isArray(days)) return days.join(',');
    return days;
};

const StarRating = ({ rating, count }: { rating?: number; count?: number }) => {
    if (rating == null) return null;
    return (
        <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-medium text-gray-700">{rating.toFixed(1)}</span>
            {(count ?? 0) > 0 && (
                <span className="text-xs text-gray-400">
                    ({(count ?? 0) >= 1000 ? `${((count ?? 0) / 1000).toFixed(1)}k` : count})
                </span>
            )}
        </span>
    );
};

const GradeBadge = ({ grade }: { grade?: string }) => {
    if (!grade) return null;
    const c = gradeColor(grade);
    return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>{grade} avg</span>;
};

const PrereqDot = ({ met, text }: { met: boolean; text?: string }) => (
    <span className={`flex items-center gap-1 text-[10px] ${met ? 'text-green-600' : 'text-yellow-600'}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${met ? 'bg-green-500' : 'bg-yellow-500'}`} />
        {met ? 'Good to take' : `Missing: ${text ?? 'prerequisites'}`}
    </span>
);

interface FilterDropdownProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (vals: string[]) => void;
    single?: boolean;
    allLabel?: string;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
    label, options, selected, onChange, single = false, allLabel,
}) => {
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);

    const checkScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollUp(el.scrollTop > 0);
        setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    };

    useEffect(() => {
        if (open) setTimeout(checkScroll, 50);
    }, [open, options]);

    const scroll = (dir: 'up' | 'down') => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollBy({ top: dir === 'up' ? -80 : 80, behavior: 'smooth' });
    };

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            const buttonWrapper = buttonRef.current?.closest('[data-filter-dropdown]');
            const portalMenu = document.querySelector('[data-filter-menu]');
            if (!buttonWrapper?.contains(target) && !portalMenu?.contains(target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleOpen = () => {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuStyle({
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left,
                zIndex: 99999,
            });
        }
        setOpen(p => !p);
    };

    const toggle = (val: string) => {
        if (single) {
            onChange(selected[0] === val ? [] : [val]);
            setOpen(false);
        } else {
            onChange(selected.includes(val) ? selected.filter(x => x !== val) : [...selected, val]);
        }
    };

    const displayLabel = selected.length === 0
        ? (allLabel ?? label)
        : selected.length === 1
            ? selected[0]
            : `${selected[0]} +${selected.length - 1}`;

    const isActive = selected.length > 0;

    return (
        <div data-filter-dropdown>
            <button
                ref={buttonRef}
                onClick={handleOpen}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap
                    ${isActive
                        ? 'bg-green-500 border-green-500 text-white font-medium'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}
            >
                {displayLabel}
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>

            {open && ReactDOM.createPortal(
                <div
                    style={menuStyle}
                    data-filter-menu
                    className="bg-white border border-gray-200 rounded-2xl shadow-lg py-1 min-w-[140px]"
                >
                    {canScrollUp && (
                        <button
                            onClick={() => scroll('up')}
                            className="w-full flex items-center justify-center py-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                        >
                            <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {isActive && (
                        <>
                            <button
                                onClick={() => { onChange([]); setOpen(false); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-gray-50"
                            >
                                Clear
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                        </>
                    )}

                    <div
                        ref={scrollRef}
                        onScroll={checkScroll}
                        style={{ maxHeight: '200px', overflowY: 'auto', scrollbarWidth: 'none' }}
                        className="[&::-webkit-scrollbar]:hidden"
                    >
                        {options.map(opt => (
                            <button
                                key={opt}
                                onClick={() => toggle(opt)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                            >
                                <span className="font-medium">{opt}</span>
                                {selected.includes(opt) && <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                            </button>
                        ))}
                    </div>

                    {canScrollDown && (
                        <button
                            onClick={() => scroll('down')}
                            className="w-full flex items-center justify-center py-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                        >
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

interface CourseCardProps {
    course: DiscoveryCourse;
    inCart: boolean;
    isSelected: boolean;
    onClick: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, inCart, isSelected, onClick }) => (
    <div
        onClick={onClick}
        className={`
            relative p-3 rounded-md border cursor-pointer transition-all select-none
            ${isSelected
                ? 'border-green-400 bg-green-50 shadow-sm'
                : inCart
                    ? 'border-green-300 bg-green-50/50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }
        `}
    >
        {inCart && (
            <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-white fill-white" />
            </span>
        )}
        <div className="pr-5">
            <div className="text-xs font-bold text-gray-800">{course.course_code}</div>
            <div className="text-[11px] text-gray-500 mb-1">{course.credits} cr · {course.department}</div>
            <div className="text-xs font-medium text-gray-800 leading-snug line-clamp-2 mb-2">{course.course_name}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            <GradeBadge grade={course.avg_grade} />
            <StarRating rating={course.avg_rating} count={course.rating_count} />
        </div>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <PrereqDot met={course.prereqs_met} text={course.prereqs_text} />
            {course.satisfies_core && (
                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                    <BookOpen className="w-2.5 h-2.5" /> Core
                </span>
            )}
        </div>
    </div>
);

interface DetailPanelProps {
    course: DiscoveryCourse;
    inCart: boolean;
    cartPinnedSection?: string;
    onAdd: (courseId: string, section?: string) => void;
    onRemove: (courseId: string) => void;
    onSwapSection: (courseId: string, section: string) => void;
    semester?: string;
}

const DetailPanel: React.FC<DetailPanelProps> = ({
    course, inCart, cartPinnedSection, onAdd, onRemove, onSwapSection, semester,
}) => {
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <div className="p-4 border-b border-gray-100">
                <div className="mb-2">
                    <div className="text-xs font-bold text-green-600">{course.course_code}</div>
                    <div className="text-sm font-semibold text-gray-900 leading-snug mt-0.5">{course.course_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{course.credits} credit hours · {course.school}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                    <GradeBadge grade={course.avg_grade} />
                    <StarRating rating={course.avg_rating} count={course.rating_count} />
                    {course.satisfies_core && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                            <BookOpen className="w-2.5 h-2.5" /> Satisfies Core
                        </span>
                    )}
                </div>
                <PrereqDot met={course.prereqs_met} text={course.prereqs_text} />
            </div>

            <div className="p-4 border-b border-gray-100">
                {course.description && (
                    <p className="text-xs text-gray-600 leading-relaxed">{course.description}</p>
                )}
                <div className="mt-2.5 space-y-1.5">
                    {course.coreqs_text && (
                        <div className="text-[11px] text-gray-500">
                            <span className="font-semibold text-gray-600">Co-Requisite: </span>{course.coreqs_text}
                        </div>
                    )}
                    {course.equivalent && (
                        <div className="text-[11px] text-gray-500">
                            <span className="font-semibold text-gray-600">Equivalent: </span>{course.equivalent}
                        </div>
                    )}
                    {course.max_repeat_credits && (
                        <div className="text-[11px] text-gray-500">
                            <span className="font-semibold text-gray-600">Max Repeat Credits: </span>{course.max_repeat_credits} hrs
                        </div>
                    )}
                </div>
                {(course.instructor_permission || course.standing_requirement || course.gpa_requirement || course.major_restriction || course.aleks_score || course.placement_exam) && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {course.instructor_permission && (
                            <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-medium">Instructor Permission</span>
                        )}
                        {course.standing_requirement && (
                            <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">{course.standing_requirement}</span>
                        )}
                        {course.gpa_requirement && (
                            <span className="text-[10px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded font-medium">GPA ≥ {course.gpa_requirement}</span>
                        )}
                        {course.major_restriction && (
                            <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">{course.major_restriction}</span>
                        )}
                        {course.aleks_score && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">ALEKS ≥ {course.aleks_score}</span>
                        )}
                        {course.placement_exam && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">Placement Exam Required</span>
                        )}
                    </div>
                )}
                {course.footnote && (
                    <p className="mt-2.5 text-[10px] text-gray-400 italic leading-relaxed">{course.footnote}</p>
                )}
                {course.syllabus_url && (
                    <a
                        href={course.syllabus_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2.5 text-xs text-green-600 hover:text-green-700 font-medium"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        View Syllabus
                        <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                )}
            </div>

            {course.top_professors && course.top_professors.length > 0 && (
                <div className="p-4 border-b border-gray-100">
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Award className="w-3 h-3" /> Top Professors
                    </div>
                    <div className="space-y-1.5">
                        {course.top_professors.map(p => {
                            const gLabel = p.avg_gpa >= 3.7 ? 'A-' : p.avg_gpa >= 3.3 ? 'B+' : 'B';
                            const gc = gradeColor(gLabel);
                            return (
                                <div key={p.name} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-700 font-medium truncate">{p.name}</span>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${gc.bg} ${gc.text}`}>
                                            {p.avg_gpa.toFixed(1)} GPA
                                        </span>
                                        <StarRating rating={p.rating} count={0} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="p-4 flex-1">
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Sections{semester ? ` · ${semester}` : ''}
                </div>
                <div className="space-y-2">
                    {course.sections.map(sec => {
                        const isPinned = inCart && cartPinnedSection === sec.section;
                        const isOpen = expandedSection === sec.section;
                        const modality = modalityFromSection(sec);
                        const daysStr = normalizeDays(sec.days);

                        return (
                            <div
                                key={sec.section}
                                className={`rounded-md border text-xs transition-all ${isPinned ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}
                            >
                                <div
                                    className="flex items-center gap-2 p-2.5 cursor-pointer"
                                    onClick={() => setExpandedSection(isOpen ? null : sec.section)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-gray-800">{sec.section}</span>
                                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${modalityBadge(modality)}`}>
                                                {modalityLabel(modality)}
                                            </span>
                                            {isPinned && (
                                                <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Pinned</span>
                                            )}
                                        </div>
                                        <div className="text-gray-500 mt-0.5 truncate">{sec.instructors}</div>
                                        <div className="text-gray-400 mt-0.5">{sec.times_12h}</div>
                                    </div>
                                    {isOpen
                                        ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                        : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    }
                                </div>

                                {isOpen && (
                                    <div className="px-2.5 pb-2.5 pt-0 border-t border-gray-100 space-y-1.5">
                                        {daysStr && (
                                            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                                <Clock className="w-3 h-3 flex-shrink-0" />
                                                <span>{daysStr.split(',').map(d => d.trim().slice(0, 3)).join(' / ')} · {sec.times_12h}</span>
                                            </div>
                                        )}
                                        {sec.location && (
                                            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                                <span>{sec.location}</span>
                                            </div>
                                        )}
                                        {sec.syllabus && (
                                            <a href={sec.syllabus} target="_blank" rel="noreferrer"
                                                className="flex items-center gap-1 text-[10px] text-green-600 hover:text-green-700 font-medium">
                                                <FileText className="w-3 h-3" /> Section Syllabus
                                            </a>
                                        )}
                                        {inCart && cartPinnedSection !== sec.section && (
                                            <button
                                                onClick={() => onSwapSection(course.course_id, sec.section)}
                                                className="flex items-center gap-1 text-[10px] text-green-600 hover:text-green-700 font-medium mt-1"
                                            >
                                                <RefreshCw className="w-3 h-3" /> Pin this section
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex-shrink-0">
                {inCart ? (
                    <button
                        onClick={() => onRemove(course.course_id)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors"
                    >
                        <Minus className="w-3.5 h-3.5" /> Remove from Cart
                    </button>
                ) : (
                    <button
                        onClick={() => onAdd(course.course_id)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 text-xs font-medium transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add to Cart
                    </button>
                )}
            </div>
        </div>
    );
};

interface CartPanelProps {
    cart: CartItem[];
    onRemove: (courseId: string) => void;
    onSwapSection: (courseId: string, section: string) => void;
    onCheckout: () => void;
}

const CartPanel: React.FC<CartPanelProps> = ({ cart, onRemove, onCheckout }) => {
    const totalCredits = cart.reduce((s, item) => s + item.course.credits, 0);
    const creditStatus =
        totalCredits > 18
            ? { text: `${totalCredits} hrs — may need advisor approval`, color: 'text-red-600 bg-red-50' }
            : totalCredits >= 12
                ? { text: `${totalCredits} hrs — full-time load`, color: 'text-green-600 bg-green-50' }
                : { text: `${totalCredits} hrs — part-time load`, color: 'text-yellow-600 bg-yellow-50' };

    if (cart.length === 0) return (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 p-6">
            <ShoppingCart className="w-8 h-8 opacity-30" />
            <p className="text-xs text-center">Your cart is empty.<br />Add courses to get started.</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    {cart.length} Course{cart.length !== 1 ? 's' : ''} in Cart
                </div>
                {cart.map(item => (
                    <div key={item.course.course_id} className="border border-gray-200 rounded-md p-3 bg-white">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="text-xs font-semibold text-gray-800">{item.course.course_code}</div>
                                <div className="text-[11px] text-gray-500 leading-snug mt-0.5 line-clamp-2">{item.course.course_name}</div>
                                <div className="text-[10px] text-gray-400 mt-1">{item.course.credits} cr · {item.course.department}</div>
                            </div>
                            <button
                                onClick={() => onRemove(item.course.course_id)}
                                className="flex-shrink-0 p-1 text-gray-300 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <GradeBadge grade={item.course.avg_grade} />
                            <StarRating rating={item.course.avg_rating} count={item.course.rating_count} />
                        </div>
                        {item.pinned_section && (
                            <div className="text-[10px] text-green-600 mt-1.5 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Pinned: Section {item.pinned_section}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="p-4 border-t border-gray-200 flex-shrink-0 space-y-2">
                <div className={`text-[11px] font-medium px-2.5 py-1.5 rounded-md ${creditStatus.color}`}>
                    {creditStatus.text}
                </div>
                <button
                    onClick={onCheckout}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 text-xs font-medium transition-colors"
                >
                    Review &amp; Checkout <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

interface CheckoutPanelProps {
    cart: CartItem[];
    onBack: () => void;
    onConfirm: () => void;
}

const CheckoutPanel: React.FC<CheckoutPanelProps> = ({ cart, onBack, onConfirm }) => {
    const totalCredits = cart.reduce((s, item) => s + item.course.credits, 0);

    const creditStatus =
        totalCredits > 18
            ? { text: `${totalCredits} hrs — may need advisor approval`, color: 'text-red-600 bg-red-50' }
            : totalCredits >= 12
                ? { text: `${totalCredits} hrs — full-time load`, color: 'text-green-600 bg-green-50' }
                : { text: `${totalCredits} hrs`, color: 'text-yellow-600 bg-yellow-50' };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <button onClick={onBack} className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 mb-3">
                    ← Back to cart
                </button>
                <div className="text-sm font-semibold text-gray-900">Ready to Plan</div>
                <div className="text-xs text-gray-500 mt-0.5">
                    These courses will appear in your sidebar. Drag them into any semester whenever you're ready.
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {cart.map(item => (
                    <div key={item.course.course_id} className="border border-purple-200 rounded-md p-3 bg-purple-50">
                        <div className="text-xs font-semibold text-gray-800">{item.course.course_code} · {item.course.course_name}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{item.course.credits} cr · {item.course.department}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                            <GradeBadge grade={item.course.avg_grade} />
                            <StarRating rating={item.course.avg_rating} count={item.course.rating_count} />
                        </div>
                        {item.pinned_section && (
                            <div className="text-[10px] text-purple-600 mt-1">Section {item.pinned_section} noted</div>
                        )}
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-gray-200 flex-shrink-0 space-y-3">
                <div className={`text-[11px] font-medium px-2.5 py-1.5 rounded-md ${creditStatus.color}`}>
                    {creditStatus.text}
                </div>
                <button
                    onClick={onConfirm}
                    disabled={cart.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-purple-500 text-white
                        hover:bg-purple-600 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <CheckCircle className="w-4 h-4" />
                    Move to Sidebar →
                </button>
            </div>
        </div>
    );
};

type RightPanel = 'detail' | 'cart' | 'checkout' | null;

const CourseDiscoveryModal: React.FC<CourseDiscoveryModalProps> = ({
    onClose,
    onAddToPlan: _onAddToPlan,
    semester = '',
    cart,
    onCartChange,
    semesters: _semesters,
    dropCourse: _dropCourse,
    apiBaseUrl,
    getAuthToken,
    educationLevel = 'undergraduate',
    completedCourseCodes = [],
}) => {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
    const [selectedDept, setSelectedDept] = useState('All');
    const [selectedPrefixes, setSelectedPrefixes] = useState<string[]>([]);
    const [selectedCredits, setSelectedCredits] = useState<string[]>([]);
    const [coreOnly, setCoreOnly] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [rightPanel, setRightPanel] = useState<RightPanel>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    // API state
    const [courses, setCourses] = useState<DiscoveryCourse[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [allSchools, setAllSchools] = useState<string[]>([]);
    const [allPrefixes, setAllPrefixes] = useState<string[]>([]);

    const [noAleks, setNoAleks] = useState(false);
    const [noPerm, setNoPerm] = useState(false);
    const [selectedStanding, setSelectedStanding] = useState<string[]>([]);
    const [hideCompleted, setHideCompleted] = useState(true);
    const [hideStaged, setHideStaged] = useState(true);

    const addStagedCourses = usePlannerStore(s => s.addStagedCourses);
    const searchRef = useRef<HTMLInputElement>(null);

    const fetchCourses = useCallback(async (newOffset: number = 0) => {
        const token = await getAuthToken();
        if (!token) return;
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();

        const upperQuery = debouncedQuery.trim().toUpperCase();
        const isPrefix = allPrefixes.includes(upperQuery);

        if (debouncedQuery) {
            if (isPrefix) {
                params.set('subjects', upperQuery);
            } else {
                params.set('q', debouncedQuery.toLowerCase().trim());
            }
        }

        if (selectedSchools.length) params.set('schools', selectedSchools.join(','));
        if (selectedPrefixes.length) params.set('subjects', selectedPrefixes.join(','));
        if (selectedCredits.length) params.set('credits', selectedCredits.map(c => c === '4+' ? '4' : c).join(','));
        if (noAleks) params.set('no_aleks', 'true');
        if (noPerm) params.set('no_perm', 'true');
        if (selectedStanding.length) params.set('standing', selectedStanding.join(','));
        if (coreOnly) params.set('core_only', 'true');
        params.set('education_level', educationLevel);
        params.set('limit', String(newOffset === 0 ? 500 : LIMIT));
        params.set('offset', String(newOffset));

        try {
            const res = await fetch(`${apiBaseUrl}/discover?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();

            const satisfiedSet = new Set<string>(
                completedCourseCodes.map((code: string) => normalizeCourseCode(code)).filter(Boolean) as string[]
            );

            const normalized: DiscoveryCourse[] = data.courses.map((c: any) => {
                const prereqGroups = getCoursePrerequisiteGroups({ "Pre-Requisite": c.prereqs_raw });
                const missing = getMissingPrerequisiteGroups(prereqGroups, satisfiedSet);

                return {
                    ...c,
                    course_id: c.course_code.replace(/\s+/g, '').toLowerCase(),
                    subject_prefix: c.course_code.split(' ')[0],
                    subject: c.course_code.split(' ')[0],
                    prereqs_met: prereqGroups.length === 0 || missing.length === 0,
                };
            });

            setCourses(prev => {
                const merged = newOffset === 0 ? normalized : [...prev, ...normalized];
                return merged.filter((c, i, arr) => arr.findIndex(x => x.course_id === c.course_id) === i);
            });

            setTotal(data.total);
            setHasMore(data.has_more);
            setOffset(newOffset + LIMIT);
        } catch {
            setError('Failed to load courses. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [selectedSchools, selectedPrefixes, selectedCredits, coreOnly, educationLevel, apiBaseUrl, completedCourseCodes, debouncedQuery, noAleks, noPerm, selectedStanding]);

    useEffect(() => { searchRef.current?.focus(); }, []);

    // debouncer to prevent hammering API 
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Fetch on filter change, reset to page 0
    useEffect(() => {
        fetchCourses(0);
    }, [selectedSchools, selectedPrefixes, selectedCredits, coreOnly, selectedDept, educationLevel, debouncedQuery, noAleks, noPerm, selectedStanding]);

    const coursesWithInstructors = useMemo(() =>
        courses.map(c => ({
            ...c,
            _instructors: c.sections.map(s => s.instructors).filter(Boolean).join(' '),
        }))
        , [courses]);

    // Derive available prefixes and schools from API results
    const availableSchools = allSchools;
    const availablePrefixes = allPrefixes;

    const activeFilterCount = useMemo(() => [
        selectedSchools.length > 0,
        selectedDept !== 'All',
        selectedPrefixes.length > 0,
        selectedCredits.length > 0,
        coreOnly,
        noAleks,
        noPerm,
        selectedStanding.length > 0,
    ].filter(Boolean).length, [selectedSchools, selectedDept, selectedPrefixes, selectedCredits, coreOnly, noAleks, noPerm, selectedStanding]);

    useEffect(() => {
        if (courses.length === 0) return;
        setAllSchools(prev => [...new Set([...prev, ...courses.map(c => c.school).filter(Boolean)])].sort());
        setAllPrefixes(prev => [...new Set([...prev, ...courses.map(c => c.subject_prefix).filter(Boolean)])].sort());
    }, [courses]);

    // Fuse for client-side fuzzy text search over loaded results
    const fuse = useMemo(() => new Fuse(coursesWithInstructors, {
        keys: [
            { name: 'course_code', weight: 2.0 },
            { name: 'course_name', weight: 1.5 },
            { name: 'description', weight: 0.8 },
            { name: 'department', weight: 0.6 },
            { name: '_instructors', weight: 1.2 },
            { name: 'prereqs_text', weight: 0.3 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2,
    }), [coursesWithInstructors]);

    const stagedCourses = usePlannerStore(s => s.stagedCourses);

    const filteredCourses = useMemo(() => {
        const completedSet = new Set(completedCourseCodes.map(c => normalizeCourseCode(c)));
        const stagedSet = new Set(stagedCourses.map(c => c.course_id));

        let results = hideCompleted
            ? courses.filter(c => !completedSet.has(normalizeCourseCode(c.course_code)))
            : courses;

        if (hideCompleted) results = results.filter(c => !completedSet.has(normalizeCourseCode(c.course_code)));
        if (hideStaged) results = results.filter(c => !stagedSet.has(c.course_id));

        if (!query.trim()) return results;

        const resultIds = new Set(results.map(c => c.course_id));
        return fuse.search(query).map(r => r.item).filter(c => resultIds.has(c.course_id));
    }, [query, fuse, courses, hideCompleted, hideStaged, completedCourseCodes, stagedCourses]);

    const selectedCourse = courses.find(c => c.course_id === selectedCourseId) ?? null;
    const cartItem = selectedCourse ? cart.find(i => i.course.course_id === selectedCourse.course_id) : undefined;
    const isClientFiltering = !hideCompleted || !hideStaged || !!query.trim();

    const addToCart = useCallback((courseId: string, section?: string) => {
        const course = courses.find(c => c.course_id === courseId);
        if (!course) return;
        if (cart.find(i => i.course.course_id === courseId)) return;
        onCartChange([...cart, { course, pinned_section: section }]);
    }, [courses, cart, onCartChange]);

    const removeFromCart = useCallback((courseId: string) => {
        onCartChange(cart.filter(i => i.course.course_id !== courseId));
    }, [cart, onCartChange]);

    const swapSection = useCallback((courseId: string, section: string) => {
        onCartChange(cart.map(i =>
            i.course.course_id === courseId ? { ...i, pinned_section: section } : i
        ));
    }, [cart, onCartChange]);

    const openDetail = (courseId: string) => {
        setSelectedCourseId(courseId);
        setRightPanel('detail');
    };

    const openCart = () => {
        setSelectedCourseId(null);
        setRightPanel(prev => prev === 'cart' ? null : 'cart');
    };

    const handleCheckout = () => setRightPanel('checkout');
    const handleBackToCart = () => setRightPanel('cart');

    const handleConfirm = () => {
        setConfirmed(true);

        const staged: StagedCourse[] = cart.map(item => ({
            course_id: item.course.course_id,
            course_code: item.course.course_code,
            course_name: item.course.course_name,
            credits: item.course.credits,
            prereqs_met: item.course.prereqs_met,
            prereqs_text: item.course.prereqs_text,
            coreqs_text: item.course.coreqs_text,
            satisfies_core: item.course.satisfies_core,
            description: item.course.description,
            prerequisites: item.course.prereqs_raw,
            'Pre-Requisite': item.course.prereqs_raw,
        }));

        addStagedCourses(staged);
        onCartChange([]);

        setTimeout(() => {
            setConfirmed(false);
            setRightPanel(null);
        }, 1200);
    };

    const handleSchoolChange = (schools: string[]) => {
        console.log('school changed', schools);
        setSelectedSchools(schools);
        setSelectedDept('All');
        setSelectedPrefixes([]);
    };

    const clearAllFilters = () => {
        setSelectedSchools([]);
        setSelectedDept('All');
        setSelectedPrefixes([]);
        setSelectedCredits([]);
        setCoreOnly(false);
        setQuery('');
        setNoAleks(false);
        setNoPerm(false);
        setSelectedStanding([]);
    };

    const showingAll = !hideCompleted && !hideStaged;
    const year = getCurrentCatalogYear();

    return ReactDOM.createPortal(
        <>
            <div className="fixed inset-0 bg-black bg-opacity-40 z-[9998]" />
            <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                <div className={`
                    bg-white sm:rounded-xl rounded-t-2xl shadow-2xl w-full pointer-events-auto
                    h-[95dvh] sm:h-auto sm:max-h-[90vh] flex flex-col transition-all duration-300
                    ${rightPanel ? 'sm:max-w-5xl' : 'sm:max-w-2xl'}
                `}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                <Compass className="w-[18px] h-[18px] text-green-500" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Course Discovery</h2>
                                <p className="text-xs text-gray-500">{year} - {parseInt(year) + 1}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                                onClick={() => setShowFilters(p => !p)}
                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors
                                    ${showFilters ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Filters</span>
                                {activeFilterCount > 0 && (
                                    <span className="bg-green-500 text-white text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={openCart}
                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors
                                    ${rightPanel === 'cart' || rightPanel === 'checkout'
                                        ? 'bg-green-50 border-green-300 text-green-700'
                                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Cart</span>
                                {cart.length > 0 && (
                                    <span className="bg-green-500 text-white text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center">
                                        {cart.length}
                                    </span>
                                )}
                            </button>
                            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="px-5 py-3 border-b border-gray-200 flex-shrink-0">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search courses, professors, keywords…"
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg
                                    focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent
                                    bg-gray-50 placeholder-gray-400"
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active filter chips */}
                    {(selectedSchools.length > 0 || selectedPrefixes.length > 0 || selectedCredits.length > 0 || coreOnly || noPerm || noAleks || selectedStanding.length > 0) && (
                        <div className="px-5 py-1.5 flex items-center gap-2 flex-wrap border-b border-gray-100 flex-shrink-0">
                            <span className="text-xs text-gray-400">Active:</span>
                            {selectedSchools.map(s => (
                                <button key={s} onClick={() => handleSchoolChange(selectedSchools.filter(x => x !== s))}
                                    className="text-xs bg-green-100 text-green-700 rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1 hover:bg-green-200">
                                    {s} <X className="w-2.5 h-2.5" />
                                </button>
                            ))}
                            {selectedPrefixes.map(p => (
                                <button key={p} onClick={() => setSelectedPrefixes(prev => prev.filter(x => x !== p))}
                                    className="text-xs bg-green-100 text-green-700 rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1 hover:bg-green-200">
                                    {p} <X className="w-2.5 h-2.5" />
                                </button>
                            ))}
                            {selectedCredits.map(c => (
                                <button key={c} onClick={() => setSelectedCredits(prev => prev.filter(x => x !== c))}
                                    className="text-xs bg-green-100 text-green-700 rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1 hover:bg-green-200">
                                    {c} cr <X className="w-2.5 h-2.5" />
                                </button>
                            ))}
                            {coreOnly && (
                                <button onClick={() => setCoreOnly(false)}
                                    className="text-xs bg-blue-100 text-blue-700 rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1 hover:bg-blue-200">
                                    Core req <X className="w-2.5 h-2.5" />
                                </button>
                            )}
                            {noPerm && (
                                <button onClick={() => setNoPerm(false)}
                                    className="text-xs bg-green-100 text-green-700 rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1 hover:bg-green-200">
                                    No permission req <X className="w-2.5 h-2.5" />
                                </button>
                            )}
                            {noAleks && (
                                <button onClick={() => setNoAleks(false)}
                                    className="text-xs bg-green-100 text-green-700 rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1 hover:bg-green-200">
                                    No ALEKS req <X className="w-2.5 h-2.5" />
                                </button>
                            )}
                            {selectedStanding.map(s => (
                                <button key={s} onClick={() => setSelectedStanding(prev => prev.filter(x => x !== s))}
                                    className="text-xs bg-green-100 text-green-700 rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1 hover:bg-green-200">
                                    {s} <X className="w-2.5 h-2.5" />
                                </button>
                            ))}

                            <button onClick={clearAllFilters}
                                className="text-xs text-gray-400 hover:text-gray-600 ml-1 underline underline-offset-2">
                                Clear all
                            </button>
                        </div>
                    )}

                    {/* Filters panel */}
                    {showFilters && (
                        <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50 flex-shrink-0 overflow-x-auto">
                            <div className="flex gap-4 items-start min-w-max">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">School</span>
                                    <FilterDropdown
                                        label="School"
                                        options={availableSchools}
                                        selected={selectedSchools}
                                        onChange={handleSchoolChange}
                                        allLabel="All schools"
                                    />
                                </div>

                                {availablePrefixes.length > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Subject</span>
                                        <FilterDropdown
                                            label="Subject"
                                            options={availablePrefixes}
                                            selected={selectedPrefixes}
                                            onChange={setSelectedPrefixes}
                                            allLabel="All subjects"
                                        />
                                    </div>
                                )}

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Credits</span>
                                    <FilterDropdown
                                        label="Credits"
                                        options={['1', '2', '3', '4+']}
                                        selected={selectedCredits}
                                        onChange={setSelectedCredits}
                                        allLabel="Any credits"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Attributes</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        <button onClick={() => setCoreOnly(p => !p)}
                                            className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1 whitespace-nowrap
                                                ${coreOnly
                                                    ? 'bg-green-500 border-green-500 text-white font-medium'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}>
                                            <BookOpen className="w-3 h-3" /> Satisfies Core
                                        </button>

                                        <button onClick={() => setNoPerm(p => !p)}
                                            className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1 whitespace-nowrap
                                                ${noPerm ? 'bg-green-500 border-green-500 text-white font-medium' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}>
                                            <CheckCircle className="w-3 h-3" /> No Permission Required
                                        </button>
                                        <button onClick={() => setNoAleks(p => !p)}
                                            className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1 whitespace-nowrap
                                                ${noAleks ? 'bg-green-500 border-green-500 text-white font-medium' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}>
                                            <AlertCircle className="w-3 h-3" /> No ALEKS Required
                                        </button>
                                        <FilterDropdown
                                            label="Standing"
                                            options={['Freshman', 'Sophomore', 'Junior', 'Senior']}
                                            selected={selectedStanding}
                                            onChange={setSelectedStanding}
                                            allLabel="Any Standing"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main content */}
                    <div className="flex flex-1 overflow-hidden">
                        <div className={`flex-1 overflow-y-auto min-w-0 ${rightPanel ? 'hidden sm:block' : ''}`}>
                            {loading && courses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                                    <Loader2 className="w-6 h-6 animate-spin opacity-40" />
                                    <p className="text-xs">Loading courses…</p>
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-16">
                                    <AlertCircle className="w-6 h-6 opacity-30" />
                                    <p className="text-sm">{error}</p>
                                    <button onClick={() => fetchCourses(0)} className="text-xs text-green-600 hover:underline">Retry</button>
                                </div>
                            ) : filteredCourses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-16">
                                    <AlertCircle className="w-6 h-6 opacity-30" />
                                    <p className="text-sm">No courses match your filters</p>
                                    <button onClick={clearAllFilters} className="text-xs text-green-600 hover:underline">
                                        Clear filters
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4">
                                    <div className="text-xs text-gray-400 mb-3 flex items-center gap-2">
                                        <span>
                                            {isClientFiltering ? `${filteredCourses.length} of ${total}` : total} course{total !== 1 ? 's' : ''} found
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => { setHideCompleted(showingAll); setHideStaged(showingAll); }}
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors
                                                ${showingAll ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}
                                            >All</button>
                                            <button
                                                onClick={() => setHideCompleted(p => !p)}
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors
                                                ${!hideCompleted ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:bg-gray-100'}`}
                                            >Completed</button>
                                            <button
                                                onClick={() => setHideStaged(p => !p)}
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors
                                                ${!hideStaged ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:bg-gray-100'}`}
                                            >Staged</button>
                                        </div>
                                        {loading && <Loader2 className="w-3 h-3 animate-spin opacity-40" />}
                                    </div>

                                    <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                                        {filteredCourses.map((course, i) => (
                                            <CourseCard
                                                key={`${course.course_id}-${i}`}
                                                course={course}
                                                inCart={!!cart.find(i => i.course.course_id === course.course_id)}
                                                isSelected={selectedCourseId === course.course_id && rightPanel === 'detail'}
                                                onClick={() => openDetail(course.course_id)}
                                            />
                                        ))}
                                    </div>
                                    {hasMore && !query && (
                                        <button
                                            onClick={() => fetchCourses(offset)}
                                            disabled={loading}
                                            className="w-full mt-4 py-2 text-xs text-green-600 border border-green-200 rounded-md hover:bg-green-50 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                                        >
                                            {loading
                                                ? <><Loader2 className="w-3 h-3 animate-spin" /> Loading…</>
                                                : `Load more (${total - courses.length} remaining)`
                                            }
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {rightPanel && (
                            <div className="w-full sm:w-[300px] flex-shrink-0 border-l border-gray-200 flex flex-col overflow-hidden bg-white relative">
                                <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                                    <span className="text-xs font-semibold text-gray-600">
                                        {rightPanel === 'detail' && selectedCourse ? selectedCourse.course_code : ''}
                                        {rightPanel === 'cart' ? 'Your Cart' : ''}
                                        {rightPanel === 'checkout' ? 'Checkout' : ''}
                                    </span>
                                    <button onClick={() => setRightPanel(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-hidden">
                                    {rightPanel === 'detail' && selectedCourse && (
                                        <DetailPanel
                                            course={selectedCourse}
                                            inCart={!!cartItem}
                                            cartPinnedSection={cartItem?.pinned_section}
                                            onAdd={addToCart}
                                            onRemove={removeFromCart}
                                            onSwapSection={swapSection}
                                            semester={semester}
                                        />
                                    )}
                                    {rightPanel === 'cart' && (
                                        <CartPanel
                                            cart={cart}
                                            onRemove={removeFromCart}
                                            onSwapSection={swapSection}
                                            onCheckout={handleCheckout}
                                        />
                                    )}
                                    {rightPanel === 'checkout' && (
                                        <CheckoutPanel
                                            cart={cart}
                                            onBack={handleBackToCart}
                                            onConfirm={handleConfirm}
                                        />
                                    )}
                                </div>

                                {confirmed && (
                                    <div className="absolute inset-0 bg-white flex flex-col items-center justify-center gap-3 z-10">
                                        <CheckCircle className="w-10 h-10 text-green-500" />
                                        <p className="text-sm font-semibold text-gray-800">Added to degree plan!</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-xl flex-shrink-0">
                        <p className="text-xs text-gray-500">
                            {cart.length} course{cart.length !== 1 ? 's' : ''} in cart
                        </p>
                        <button
                            onClick={cart.length > 0 ? handleCheckout : undefined}
                            disabled={cart.length === 0}
                            className="px-4 py-1.5 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors
                                disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                        >
                            Review &amp; Add to Plan →
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

export default CourseDiscoveryModal;