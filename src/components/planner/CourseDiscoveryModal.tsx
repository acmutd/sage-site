import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
    X, Search, Compass, ShoppingCart, ChevronRight, ChevronDown,
    Star, BookOpen, MapPin, ExternalLink, Plus, Minus,
    CheckCircle, AlertCircle, ArrowRight, Trash2, SlidersHorizontal,
    FileText, Clock, TrendingUp, Award, RefreshCw, Layers
} from 'lucide-react';

export interface DiscoverySection {
    section: string;
    class_number: string;
    instructor: string;
    days: string;
    times_12h: string;
    location: string;
    modality: 'online' | 'hybrid' | 'inperson';
    seats_open: number;
    seats_total: number;
    waitlist: number;
    activity_type?: string;
}

export interface DiscoveryCourse {
    course_id: string;
    course_code: string;
    course_name: string;
    description: string;
    school: string;
    department: string;
    subject: string;
    subject_prefix: string;
    satisfies_core: boolean;
    credits: number;
    topics: string[];
    avg_grade: string;
    grade_score: number;
    avg_rating: number;
    rating_count: number;
    prereqs_met: boolean;
    prereqs_text: string;
    syllabus_url?: string;
    sections: DiscoverySection[];
    top_professors?: { name: string; avg_gpa: number; rating: number }[];
}

export interface CartItem {
    course: DiscoveryCourse;
    pinned_section?: string;
}

export interface CourseDiscoveryModalProps {
    onClose: () => void;
    onAddToPlan: (items: CartItem[]) => void;
    semester?: string;
}

type RawCourse = Omit<DiscoveryCourse, 'subject_prefix' | 'satisfies_core'> & {
    satisfies_core?: boolean;
};

const normalizeCourse = (c: RawCourse): DiscoveryCourse => ({
    ...c,
    subject_prefix: c.course_code.split(' ')[0],
    satisfies_core: c.satisfies_core ?? false,
});

const MOCK_COURSES: DiscoveryCourse[] = [
    normalizeCourse({
        course_id: 'cs3345', course_code: 'CS 3345', course_name: 'Data Structures & Algorithm Analysis',
        description: 'Core data structures including trees, heaps, hash tables, and graphs. Covers asymptotic analysis and algorithm design patterns. Prerequisite for most upper-division CS courses.',
        school: 'Engineering', department: 'Computer Science', subject: 'CS', credits: 3,
        topics: ['algorithms', 'data structures', 'trees', 'graphs', 'Big-O'],
        avg_grade: 'B+', grade_score: 3.3, avg_rating: 4.1, rating_count: 823,
        prereqs_met: true, prereqs_text: 'CS 2336', syllabus_url: 'https://utdallas.edu',
        top_professors: [{ name: 'Raiford Stripling', avg_gpa: 3.4, rating: 4.3 }, { name: 'Kamran Khan', avg_gpa: 3.1, rating: 3.8 }],
        sections: [
            { section: '001', class_number: '82312', instructor: 'Raiford Stripling', days: 'Monday,Wednesday,Friday', times_12h: '9:00 AM - 9:50 AM',   location: 'ECSS 2.415', modality: 'inperson', seats_open: 3,  seats_total: 90, waitlist: 14 },
            { section: '002', class_number: '82313', instructor: 'Kamran Khan',       days: 'Tuesday,Thursday',        times_12h: '1:00 PM - 2:15 PM',   location: 'ECSS 2.415', modality: 'inperson', seats_open: 17, seats_total: 75, waitlist: 0  },
            { section: '003', class_number: '82314', instructor: 'Raiford Stripling', days: 'Monday,Wednesday,Friday', times_12h: '11:00 AM - 11:50 AM', location: 'ECSS 2.415', modality: 'inperson', seats_open: 0,  seats_total: 90, waitlist: 31 },
        ],
    }),
    normalizeCourse({
        course_id: 'cs4375', course_code: 'CS 4375', course_name: 'Introduction to Machine Learning',
        description: 'Supervised and unsupervised learning, neural networks, model evaluation, regularization, and applied ML projects using Python. Heavy programming component.',
        school: 'Engineering', department: 'Computer Science', subject: 'CS', credits: 3,
        topics: ['machine learning', 'AI', 'neural networks', 'Python', 'statistics'],
        avg_grade: 'A-', grade_score: 3.7, avg_rating: 4.6, rating_count: 991,
        prereqs_met: true, prereqs_text: 'CS 3341, MATH 2418', syllabus_url: 'https://utdallas.edu',
        top_professors: [{ name: 'Yang Liu', avg_gpa: 3.8, rating: 4.7 }, { name: 'Latifur Khan', avg_gpa: 3.6, rating: 4.4 }],
        sections: [
            { section: '001', class_number: '84201', instructor: 'Yang Liu',     days: 'Tuesday,Thursday', times_12h: '11:30 AM - 12:45 PM', location: 'ECSS 2.312', modality: 'inperson', seats_open: 1, seats_total: 60, waitlist: 43 },
            { section: '002', class_number: '84202', instructor: 'Latifur Khan', days: 'Monday,Wednesday', times_12h: '4:00 PM - 5:15 PM',   location: 'ECSS 2.312', modality: 'inperson', seats_open: 9, seats_total: 60, waitlist: 0  },
        ],
    }),
    normalizeCourse({
        course_id: 'cs4347', course_code: 'CS 4347', course_name: 'Database Systems',
        description: 'Relational models, SQL, transactions, indexing, query optimization, and an introduction to NoSQL systems. Includes a semester-long project building a database-backed application.',
        school: 'Engineering', department: 'Computer Science', subject: 'CS', credits: 3,
        topics: ['databases', 'SQL', 'NoSQL', 'transactions', 'indexing'],
        avg_grade: 'B+', grade_score: 3.3, avg_rating: 4.0, rating_count: 567,
        prereqs_met: true, prereqs_text: 'CS 3345', syllabus_url: 'https://utdallas.edu',
        top_professors: [{ name: 'Nurcan Yuruk', avg_gpa: 3.4, rating: 4.1 }],
        sections: [
            { section: '001', class_number: '85010', instructor: 'Nurcan Yuruk', days: 'Tuesday,Thursday',        times_12h: '1:00 PM - 2:15 PM',   location: 'ECSS 4.619', modality: 'inperson', seats_open: 12, seats_total: 70, waitlist: 0  },
            { section: '002', class_number: '85011', instructor: 'Nurcan Yuruk', days: 'Monday,Wednesday,Friday', times_12h: '11:00 AM - 11:50 AM', location: 'ECSS 4.619', modality: 'inperson', seats_open: 0,  seats_total: 70, waitlist: 22 },
        ],
    }),
    normalizeCourse({
        course_id: 'cs4392', course_code: 'CS 4392', course_name: 'Computer Animation',
        description: 'Keyframe animation, physics simulation, character rigging, skinning, and real-time rendering techniques. Uses OpenGL and industry tools.',
        school: 'Engineering', department: 'Computer Science', subject: 'CS', credits: 3,
        topics: ['graphics', 'animation', 'OpenGL', 'game dev', 'rendering'],
        avg_grade: 'A', grade_score: 4.0, avg_rating: 4.7, rating_count: 203,
        prereqs_met: true, prereqs_text: 'CS 3305', syllabus_url: 'https://utdallas.edu',
        top_professors: [{ name: 'Balakrishnan Prabhakaran', avg_gpa: 4.0, rating: 4.7 }],
        sections: [
            { section: '001', class_number: '86100', instructor: 'Balakrishnan Prabhakaran', days: 'Tuesday,Thursday', times_12h: '2:30 PM - 3:45 PM', location: 'ECSS 2.203', modality: 'inperson', seats_open: 7, seats_total: 35, waitlist: 2 },
        ],
    }),
    normalizeCourse({
        course_id: 'cs4485', course_code: 'CS 4485', course_name: 'Computer Science Project',
        description: 'Senior capstone. Teams design, build, and present a software system for a real client. Industry-sponsored projects available. Requires 90 credit hours.',
        school: 'Engineering', department: 'Computer Science', subject: 'CS', credits: 3,
        topics: ['capstone', 'software development', 'teamwork', 'agile', 'project management'],
        avg_grade: 'A', grade_score: 4.0, avg_rating: 4.5, rating_count: 724,
        prereqs_met: true, prereqs_text: '90 credit hours', syllabus_url: 'https://utdallas.edu',
        top_professors: [{ name: 'Jason Smith', avg_gpa: 4.0, rating: 4.5 }, { name: 'Greg Ozbirn', avg_gpa: 4.0, rating: 4.6 }],
        sections: [
            { section: '001', class_number: '87001', instructor: 'Jason Smith', days: 'Tuesday,Thursday', times_12h: '2:30 PM - 3:45 PM', location: 'ECSS 4.201', modality: 'inperson', seats_open: 4,  seats_total: 25, waitlist: 0 },
            { section: '002', class_number: '87002', instructor: 'Greg Ozbirn', days: 'Monday,Wednesday', times_12h: '5:30 PM - 6:45 PM', location: 'ECSS 4.201', modality: 'inperson', seats_open: 11, seats_total: 25, waitlist: 0 },
        ],
    }),
    normalizeCourse({
        course_id: 'cs4349', course_code: 'CS 4349', course_name: 'Advanced Algorithm Design',
        description: 'Advanced techniques: greedy algorithms, dynamic programming, network flow, NP-completeness reductions, and approximation algorithms.',
        school: 'Engineering', department: 'Computer Science', subject: 'CS', credits: 3,
        topics: ['algorithms', 'NP-complete', 'dynamic programming', 'greedy', 'theory'],
        avg_grade: 'B', grade_score: 3.0, avg_rating: 3.8, rating_count: 412,
        prereqs_met: true, prereqs_text: 'CS 3345',
        top_professors: [{ name: 'Sham Navathe', avg_gpa: 3.1, rating: 3.9 }],
        sections: [
            { section: '001', class_number: '88001', instructor: 'Sham Navathe', days: 'Tuesday,Thursday',        times_12h: '10:00 AM - 11:15 AM', location: 'ECSS 2.410', modality: 'inperson', seats_open: 22, seats_total: 60, waitlist: 0 },
            { section: '002', class_number: '88002', instructor: 'Sham Navathe', days: 'Monday,Wednesday,Friday', times_12h: '2:00 PM - 2:50 PM',   location: 'ECSS 2.410', modality: 'inperson', seats_open: 8,  seats_total: 60, waitlist: 5 },
        ],
    }),
    normalizeCourse({
        course_id: 'math2418', course_code: 'MATH 2418', course_name: 'Linear Algebra',
        description: 'Vector spaces, linear transformations, eigenvalues and eigenvectors, orthogonality, and singular value decomposition.',
        school: 'Natural Sciences', department: 'Mathematics', subject: 'MATH', credits: 4,
        topics: ['linear algebra', 'matrices', 'vectors', 'eigenvalues', 'SVD'],
        avg_grade: 'A-', grade_score: 3.7, avg_rating: 4.4, rating_count: 1204,
        prereqs_met: true, prereqs_text: 'MATH 2414', syllabus_url: 'https://utdallas.edu',
        top_professors: [{ name: 'Gopal Lakhani', avg_gpa: 3.8, rating: 4.5 }, { name: 'Wieslaw Krawcewicz', avg_gpa: 3.6, rating: 4.2 }],
        sections: [
            { section: '001', class_number: '70101', instructor: 'Gopal Lakhani',      days: 'Monday,Wednesday,Friday', times_12h: '8:00 AM - 8:50 AM', location: 'GR 2.302', modality: 'inperson', seats_open: 45, seats_total: 100, waitlist: 0 },
            { section: '002', class_number: '70102', instructor: 'Wieslaw Krawcewicz', days: 'Tuesday,Thursday',        times_12h: '2:30 PM - 4:15 PM', location: 'GR 2.302', modality: 'inperson', seats_open: 0,  seats_total: 80,  waitlist: 7 },
        ],
    }),
    normalizeCourse({
        course_id: 'cs3341', course_code: 'CS 3341', course_name: 'Probability & Statistics in CS',
        description: 'Probability models, random variables, distributions, Bayesian inference, and statistical tests for CS applications.',
        school: 'Engineering', department: 'Computer Science', subject: 'CS', credits: 3,
        topics: ['probability', 'statistics', 'distributions', 'Bayesian', 'inference'],
        avg_grade: 'B+', grade_score: 3.3, avg_rating: 3.6, rating_count: 671,
        prereqs_met: true, prereqs_text: 'MATH 2414',
        top_professors: [{ name: 'Ivor Page', avg_gpa: 3.4, rating: 3.7 }],
        sections: [
            { section: '001', class_number: '83001', instructor: 'Ivor Page', days: 'Monday,Wednesday,Friday', times_12h: '10:00 AM - 10:50 AM', location: 'ECSS 2.110', modality: 'inperson', seats_open: 5,  seats_total: 70, waitlist: 8 },
            { section: '002', class_number: '83002', instructor: 'Ivor Page', days: 'Tuesday,Thursday',        times_12h: '3:30 PM - 4:45 PM',   location: 'ECSS 2.110', modality: 'inperson', seats_open: 21, seats_total: 70, waitlist: 0 },
        ],
    }),
    normalizeCourse({
        course_id: 'se4351', course_code: 'SE 4351', course_name: 'Requirements Engineering',
        description: 'Eliciting, documenting, and validating software requirements. Covers use cases, user stories, and formal specification methods.',
        school: 'Engineering', department: 'Software Engineering', subject: 'SE', credits: 3,
        topics: ['software engineering', 'requirements', 'UML', 'agile', 'specifications'],
        avg_grade: 'A-', grade_score: 3.7, avg_rating: 4.0, rating_count: 289,
        prereqs_met: true, prereqs_text: 'SE 3306',
        top_professors: [{ name: 'Lawrence Chung', avg_gpa: 3.8, rating: 4.1 }],
        sections: [
            { section: '001', class_number: '91001', instructor: 'Lawrence Chung', days: 'Tuesday,Thursday', times_12h: '1:00 PM - 2:15 PM', location: 'ECSS 4.619', modality: 'inperson', seats_open: 14, seats_total: 50, waitlist: 0 },
        ],
    }),
    normalizeCourse({
        course_id: 'psyc2301', course_code: 'PSYC 2301', course_name: 'Introductory Psychology',
        description: 'Survey of psychological science covering development, perception, memory, motivation, personality, and social behavior.',
        school: 'Behavioral Sciences', department: 'Psychology', subject: 'PSYC', credits: 3,
        topics: ['psychology', 'cognition', 'behavior', 'development', 'social'],
        avg_grade: 'A', grade_score: 4.0, avg_rating: 4.5, rating_count: 2103,
        prereqs_met: true, prereqs_text: 'None', satisfies_core: true, syllabus_url: 'https://utdallas.edu',
        top_professors: [{ name: 'Shannon Davidson', avg_gpa: 4.1, rating: 4.6 }],
        sections: [
            { section: '001', class_number: '50101', instructor: 'Shannon Davidson', days: '',                        times_12h: 'Asynchronous',        location: 'Online',    modality: 'online',   seats_open: 35, seats_total: 200, waitlist: 0 },
            { section: '002', class_number: '50102', instructor: 'Uri Hasson',       days: 'Monday,Wednesday,Friday', times_12h: '12:00 PM - 12:50 PM', location: 'GR 4.428', modality: 'inperson', seats_open: 12, seats_total: 60,  waitlist: 0 },
        ],
    }),
    normalizeCourse({
        course_id: 'phil1301', course_code: 'PHIL 1301', course_name: 'Introduction to Philosophy',
        description: 'Classic problems in epistemology, metaphysics, ethics, and political philosophy through primary texts.',
        school: 'Arts & Humanities', department: 'Philosophy', subject: 'PHIL', credits: 3,
        topics: ['philosophy', 'ethics', 'logic', 'epistemology', 'critical thinking'],
        avg_grade: 'A', grade_score: 4.0, avg_rating: 4.5, rating_count: 1432,
        prereqs_met: true, prereqs_text: 'None', satisfies_core: true,
        top_professors: [{ name: 'Joseph Jedwab', avg_gpa: 4.1, rating: 4.6 }, { name: 'Michael Rescorla', avg_gpa: 3.9, rating: 4.3 }],
        sections: [
            { section: '001', class_number: '40101', instructor: 'Joseph Jedwab',    days: '',                        times_12h: 'Asynchronous',       location: 'Online',    modality: 'online',   seats_open: 88, seats_total: 150, waitlist: 0 },
            { section: '002', class_number: '40102', instructor: 'Michael Rescorla', days: 'Monday,Wednesday,Friday', times_12h: '1:00 PM - 1:50 PM',  location: 'JO 5.610', modality: 'inperson', seats_open: 23, seats_total: 40,  waitlist: 0 },
        ],
    }),
    normalizeCourse({
        course_id: 'ee3301', course_code: 'EE 3301', course_name: 'Signals & Systems',
        description: 'Continuous and discrete-time signal analysis, Fourier series, Laplace transforms, z-transforms, and linear system stability.',
        school: 'Engineering', department: 'Electrical Engineering', subject: 'EE', credits: 3,
        topics: ['signals', 'Fourier', 'Laplace', 'circuits', 'frequency analysis'],
        avg_grade: 'B', grade_score: 3.0, avg_rating: 3.5, rating_count: 318,
        prereqs_met: false, prereqs_text: 'EE 2300, MATH 2420',
        top_professors: [{ name: 'Carlos Busso', avg_gpa: 3.1, rating: 3.6 }],
        sections: [
            { section: '001', class_number: '92001', instructor: 'Carlos Busso', days: 'Tuesday,Thursday', times_12h: '10:00 AM - 11:15 AM', location: 'ECSN 2.110', modality: 'inperson', seats_open: 30, seats_total: 60, waitlist: 0 },
        ],
    }),
    normalizeCourse({
        course_id: 'fin3320', course_code: 'FIN 3320', course_name: 'Business Finance',
        description: 'Time value of money, capital budgeting, risk-return tradeoffs, and corporate financing decisions.',
        school: 'Jindal School', department: 'Finance', subject: 'FIN', credits: 3,
        topics: ['finance', 'investment', 'valuation', 'capital budgeting', 'risk'],
        avg_grade: 'B+', grade_score: 3.3, avg_rating: 3.9, rating_count: 634,
        prereqs_met: true, prereqs_text: 'ACCT 2301',
        top_professors: [{ name: 'Nathan Jensen', avg_gpa: 3.4, rating: 4.0 }, { name: 'Tina Yang', avg_gpa: 3.2, rating: 3.7 }],
        sections: [
            { section: '001', class_number: '60101', instructor: 'Nathan Jensen', days: 'Monday,Wednesday,Friday', times_12h: '10:00 AM - 10:50 AM', location: 'JSOM 2.722', modality: 'inperson', seats_open: 28, seats_total: 80, waitlist: 0 },
            { section: '002', class_number: '60102', instructor: 'Tina Yang',     days: 'Tuesday,Thursday',        times_12h: '8:00 AM - 9:15 AM',   location: 'JSOM 2.722', modality: 'inperson', seats_open: 52, seats_total: 80, waitlist: 0 },
        ],
    }),
    normalizeCourse({
        course_id: 'hist1301', course_code: 'HIST 1301', course_name: 'U.S. History to 1865',
        description: 'Development of America from colonization through the Civil War covering political, social, and economic history.',
        school: 'Arts & Humanities', department: 'History', subject: 'HIST', credits: 3,
        topics: ['history', 'US history', 'government', 'colonization', 'Civil War'],
        avg_grade: 'A', grade_score: 4.0, avg_rating: 4.2, rating_count: 1847,
        prereqs_met: true, prereqs_text: 'None', satisfies_core: true, syllabus_url: 'https://utdallas.edu',
        top_professors: [{ name: 'Kenneth Alfers', avg_gpa: 4.1, rating: 4.3 }, { name: 'Francesca Sawaya', avg_gpa: 3.9, rating: 4.0 }],
        sections: [
            { section: '001', class_number: '41001', instructor: 'Kenneth Alfers',   days: '',                 times_12h: 'Asynchronous',      location: 'Online',    modality: 'online',   seats_open: 120, seats_total: 200, waitlist: 0 },
            { section: '002', class_number: '41002', instructor: 'Francesca Sawaya', days: 'Tuesday,Thursday', times_12h: '2:00 PM - 3:15 PM', location: 'JO 4.614', modality: 'inperson', seats_open: 18,  seats_total: 45,  waitlist: 0 },
        ],
    }),
];

const SCHOOLS = ['All', 'Engineering', 'Natural Sciences', 'Jindal School', 'Arts & Humanities', 'Behavioral Sciences'];

const DEPT_MAP: Record<string, string[]> = {
    'Engineering':         ['All', 'Computer Science', 'Electrical Engineering', 'Software Engineering', 'Mechanical Engineering'],
    'Natural Sciences':    ['All', 'Mathematics', 'Physics', 'Chemistry', 'Biology'],
    'Jindal School':       ['All', 'Finance', 'Marketing', 'Management', 'Accounting'],
    'Arts & Humanities':   ['All', 'Philosophy', 'History', 'Literature', 'Arts & Technology'],
    'Behavioral Sciences': ['All', 'Psychology', 'Criminology', 'Political Science', 'Sociology'],
};

const SORT_OPTIONS = [
    { value: 'relevance', label: 'Relevance'   },
    { value: 'grade',     label: 'Best Grades' },
    { value: 'rating',    label: 'Best Rating' },
    { value: 'seats',     label: 'Most Seats'  },
];

const GRADE_ORDER: Record<string, number> = {
    'A+': 4.3, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0,  'F': 0,
};

const gradeColor = (g: string) => {
    const s = GRADE_ORDER[g] ?? 0;
    if (s >= 3.7) return { bg: 'bg-green-100',  text: 'text-green-700'  };
    if (s >= 3.0) return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    if (s >= 2.0) return { bg: 'bg-orange-100', text: 'text-orange-700' };
    return              { bg: 'bg-red-100',    text: 'text-red-700'    };
};

const seatColor = (open: number, total: number) => {
    if (open === 0)          return 'text-red-500';
    if (open / total < 0.15) return 'text-yellow-600';
    return 'text-green-600';
};

const modalityBadge = (m: DiscoverySection['modality']) => {
    if (m === 'online')  return 'text-blue-600 bg-blue-50';
    if (m === 'hybrid')  return 'text-purple-600 bg-purple-50';
    return 'text-gray-500 bg-gray-100';
};

const modalityLabel = (m: DiscoverySection['modality']) => {
    if (m === 'online')  return 'Online';
    if (m === 'hybrid')  return 'Hybrid';
    return 'In Person';
};

function semanticMatch(course: DiscoveryCourse, q: string): boolean {
    if (!q.trim()) return true;
    const lower = q.toLowerCase();
    return (
        course.course_code.toLowerCase().includes(lower) ||
        course.course_name.toLowerCase().includes(lower) ||
        course.description.toLowerCase().includes(lower) ||
        course.department.toLowerCase().includes(lower) ||
        course.subject_prefix.toLowerCase().includes(lower) ||
        course.topics.some(t => t.toLowerCase().includes(lower)) ||
        course.sections.some(s => s.instructor.toLowerCase().includes(lower))
    );
}

const StarRating = ({ rating, count }: { rating: number; count: number }) => (
    <span className="flex items-center gap-1">
        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
        <span className="text-xs font-medium text-gray-700">{rating.toFixed(1)}</span>
        {count > 0 && (
            <span className="text-xs text-gray-400">
                ({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})
            </span>
        )}
    </span>
);

const GradeBadge = ({ grade }: { grade: string }) => {
    const c = gradeColor(grade);
    return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>{grade} avg</span>;
};

const PrereqDot = ({ met, text }: { met: boolean; text: string }) => (
    <span className={`flex items-center gap-1 text-[10px] ${met ? 'text-green-600' : 'text-yellow-600'}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${met ? 'bg-green-500' : 'bg-yellow-500'}`} />
        {met ? 'Good to take' : `Missing: ${text}`}
    </span>
);

interface SubjectDropdownProps {
    prefixes: string[];
    selected: string[];
    onChange: (prefixes: string[]) => void;
}

const SubjectDropdown: React.FC<SubjectDropdownProps> = ({ prefixes, selected, onChange }) => {
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

    const toggle = (p: string) =>
        onChange(selected.includes(p) ? selected.filter(x => x !== p) : [...selected, p]);

    const label = selected.length === 0
        ? 'All subjects'
        : selected.length === 1
            ? selected[0]
            : `${selected[0]} +${selected.length - 1}`;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(p => !p)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap
                    ${selected.length > 0
                        ? 'bg-green-500 border-green-500 text-white font-medium'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}
            >
                {label}
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                    {selected.length > 0 && (
                        <>
                            <button
                                onClick={() => { onChange([]); setOpen(false); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-gray-50"
                            >
                                Clear all
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                        </>
                    )}
                    {prefixes.map(p => (
                        <button
                            key={p}
                            onClick={() => toggle(p)}
                            className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                        >
                            <span className="font-medium">{p}</span>
                            {selected.includes(p) && <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                        </button>
                    ))}
                </div>
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
            relative p-3 rounded-lg border cursor-pointer transition-all select-none
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
}

const DetailPanel: React.FC<DetailPanelProps> = ({
    course, inCart, cartPinnedSection, onAdd, onRemove, onSwapSection,
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
                <p className="text-xs text-gray-600 leading-relaxed">{course.description}</p>
                {course.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                        {course.topics.map(t => (
                            <span key={t} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                    </div>
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
                    <Layers className="w-3 h-3" /> Sections · Spring 2026
                </div>
                <div className="space-y-2">
                    {course.sections.map(sec => {
                        const isPinned = inCart && cartPinnedSection === sec.section;
                        const isOpen   = expandedSection === sec.section;
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
                                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${modalityBadge(sec.modality)}`}>
                                                {modalityLabel(sec.modality)}
                                            </span>
                                            {isPinned && (
                                                <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Pinned</span>
                                            )}
                                        </div>
                                        <div className="text-gray-500 mt-0.5 truncate">{sec.instructor}</div>
                                        <div className="text-gray-400 mt-0.5">{sec.times_12h}</div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className={`font-semibold ${seatColor(sec.seats_open, sec.seats_total)}`}>
                                            {sec.seats_open === 0 ? 'Full' : `${sec.seats_open} open`}
                                        </div>
                                        <div className="text-gray-400 text-[10px]">{sec.seats_total - sec.seats_open}/{sec.seats_total}</div>
                                        {sec.waitlist > 0 && <div className="text-yellow-600 text-[10px]">WL: {sec.waitlist}</div>}
                                    </div>
                                    {isOpen
                                        ? <ChevronDown  className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                        : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    }
                                </div>

                                {isOpen && (
                                    <div className="px-2.5 pb-2.5 pt-0 border-t border-gray-100 space-y-1.5">
                                        {sec.days && (
                                            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                                <Clock className="w-3 h-3 flex-shrink-0" />
                                                <span>{sec.days.split(',').map(d => d.trim().slice(0, 3)).join(' / ')} · {sec.times_12h}</span>
                                            </div>
                                        )}
                                        {sec.location && (
                                            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                                <span>{sec.location}</span>
                                            </div>
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
            ? { text: `${totalCredits} hrs — may need advisor approval`, color: 'text-red-600 bg-red-50'       }
            : totalCredits >= 12
                ? { text: `${totalCredits} hrs — full-time load`,        color: 'text-green-600 bg-green-50'   }
                : { text: `${totalCredits} hrs — part-time load`,        color: 'text-yellow-600 bg-yellow-50' };

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
    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <button onClick={onBack} className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 mb-3">
                    ← Back to cart
                </button>
                <div className="text-sm font-semibold text-gray-900">Review Selections</div>
                <div className="text-xs text-gray-500 mt-0.5">These courses will be added to your Spring 2026 degree plan.</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {cart.map(item => (
                    <div key={item.course.course_id} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                        <div className="text-xs font-semibold text-gray-800">{item.course.course_code} · {item.course.course_name}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{item.course.credits} cr · {item.course.department}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                            <GradeBadge grade={item.course.avg_grade} />
                            <StarRating rating={item.course.avg_rating} count={item.course.rating_count} />
                        </div>
                        {item.pinned_section && (
                            <div className="text-[10px] text-green-600 mt-1">Section {item.pinned_section} pinned</div>
                        )}
                    </div>
                ))}
            </div>
            <div className="p-4 border-t border-gray-200 flex-shrink-0 space-y-3">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Total credit hours</span>
                    <span className="font-semibold text-gray-900">{totalCredits} hrs</span>
                </div>
                <button
                    onClick={onConfirm}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-green-500 text-white hover:bg-green-600 text-sm font-medium transition-colors"
                >
                    <CheckCircle className="w-4 h-4" /> Confirm &amp; Add to Degree Plan
                </button>
            </div>
        </div>
    );
};

type RightPanel = 'detail' | 'cart' | 'checkout' | null;

const CourseDiscoveryModal: React.FC<CourseDiscoveryModalProps> = ({
    onClose,
    onAddToPlan,
    semester = 'Spring 2026',
}) => {
    const [query,            setQuery]            = useState('');
    const [selectedSchool,   setSelectedSchool]   = useState('All');
    const [selectedDept,     setSelectedDept]     = useState('All');
    const [sortBy,           setSortBy]           = useState('relevance');
    const [activeTopic,      setActiveTopic]      = useState<string | null>(null);
    const [selectedPrefixes, setSelectedPrefixes] = useState<string[]>([]);
    const [selectedCredits,  setSelectedCredits]  = useState<string[]>([]);
    const [modeFilter,       setModeFilter]       = useState('all');
    const [coreOnly,         setCoreOnly]         = useState(false);
    const [cart,             setCart]             = useState<CartItem[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [rightPanel,       setRightPanel]       = useState<RightPanel>(null);
    const [showFilters,      setShowFilters]      = useState(false);
    const [confirmed,        setConfirmed]        = useState(false);

    const searchRef = useRef<HTMLInputElement>(null);
    useEffect(() => { searchRef.current?.focus(); }, []);

    const availablePrefixes = useMemo(() => {
        const pool = selectedSchool === 'All'
            ? MOCK_COURSES
            : MOCK_COURSES.filter(c => c.school === selectedSchool);
        return [...new Set(pool.map(c => c.subject_prefix))].sort();
    }, [selectedSchool]);

    const activeFilterCount = useMemo(() => [
        selectedSchool !== 'All',
        selectedDept !== 'All',
        activeTopic !== null,
        sortBy !== 'relevance',
        selectedPrefixes.length > 0,
        selectedCredits.length > 0,
        modeFilter !== 'all',
        coreOnly,
    ].filter(Boolean).length, [selectedSchool, selectedDept, activeTopic, sortBy, selectedPrefixes, selectedCredits, modeFilter, coreOnly]);

    const filteredCourses = useMemo(() => {
        let results = MOCK_COURSES;

        if (selectedSchool !== 'All')    results = results.filter(c => c.school === selectedSchool);
        if (selectedDept !== 'All')      results = results.filter(c => c.department === selectedDept);
        if (activeTopic)                 results = results.filter(c => c.topics.includes(activeTopic));
        if (query)                       results = results.filter(c => semanticMatch(c, query));
        if (selectedPrefixes.length > 0) results = results.filter(c => selectedPrefixes.includes(c.subject_prefix));
        if (selectedCredits.length > 0)  results = results.filter(c => {
            const cr = c.credits;
            return selectedCredits.some(s => s === '4+' ? cr >= 4 : cr === parseInt(s));
        });
        if (modeFilter !== 'all') results = results.filter(c => c.sections.some(s => s.modality === modeFilter));
        if (coreOnly)             results = results.filter(c => c.satisfies_core);

        if (sortBy === 'grade')  results = [...results].sort((a, b) => b.grade_score - a.grade_score);
        if (sortBy === 'rating') results = [...results].sort((a, b) => b.avg_rating - a.avg_rating);
        if (sortBy === 'seats')  results = [...results].sort((a, b) => {
            const aMax = Math.max(...a.sections.map(s => s.seats_open));
            const bMax = Math.max(...b.sections.map(s => s.seats_open));
            return bMax - aMax;
        });

        return results;
    }, [query, selectedSchool, selectedDept, sortBy, activeTopic, selectedPrefixes, selectedCredits, modeFilter, coreOnly]);

    const allTopics = useMemo(() => {
        const pool = selectedSchool === 'All'
            ? MOCK_COURSES
            : MOCK_COURSES.filter(c => c.school === selectedSchool);
        const counts: Record<string, number> = {};
        pool.forEach(c => c.topics.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t);
    }, [selectedSchool]);

    const depts          = DEPT_MAP[selectedSchool] || [];
    const selectedCourse = MOCK_COURSES.find(c => c.course_id === selectedCourseId) ?? null;
    const cartItem       = selectedCourse ? cart.find(i => i.course.course_id === selectedCourse.course_id) : undefined;
    const hasResults     = !!(query.trim() || selectedSchool !== 'All' || activeTopic || selectedPrefixes.length > 0 || coreOnly);

    const addToCart = useCallback((courseId: string, section?: string) => {
        const course = MOCK_COURSES.find(c => c.course_id === courseId);
        if (!course) return;
        setCart(prev => prev.find(i => i.course.course_id === courseId)
            ? prev
            : [...prev, { course, pinned_section: section }]
        );
    }, []);

    const removeFromCart = useCallback((courseId: string) => {
        setCart(prev => prev.filter(i => i.course.course_id !== courseId));
    }, []);

    const swapSection = useCallback((courseId: string, section: string) => {
        setCart(prev => prev.map(i =>
            i.course.course_id === courseId ? { ...i, pinned_section: section } : i
        ));
    }, []);

    const openDetail = (courseId: string) => {
        setSelectedCourseId(courseId);
        setRightPanel('detail');
    };

    const openCart = () => {
        setSelectedCourseId(null);
        setRightPanel(prev => prev === 'cart' ? null : 'cart');
    };

    const handleCheckout   = () => setRightPanel('checkout');
    const handleBackToCart = () => setRightPanel('cart');

    const handleConfirm = () => {
        setConfirmed(true);
        onAddToPlan(cart);
        setTimeout(() => {
            setCart([]);
            setConfirmed(false);
            setRightPanel(null);
        }, 1800);
    };

    const handleSchoolChange = (school: string) => {
        setSelectedSchool(school);
        setSelectedDept('All');
        setSelectedPrefixes([]);
        setActiveTopic(null);
    };

    const clearAllFilters = () => {
        setSelectedSchool('All');
        setSelectedDept('All');
        setSelectedPrefixes([]);
        setSelectedCredits([]);
        setModeFilter('all');
        setCoreOnly(false);
        setSortBy('relevance');
        setActiveTopic(null);
        setQuery('');
    };

    return ReactDOM.createPortal(
        <>
            <div className="fixed inset-0 bg-black bg-opacity-40 z-[9998]" />
            <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                <div className={`
                    bg-white sm:rounded-xl rounded-t-2xl shadow-2xl w-full pointer-events-auto
                    h-[95dvh] sm:h-auto sm:max-h-[90vh] flex flex-col transition-all duration-300
                    ${rightPanel ? 'sm:max-w-5xl' : 'sm:max-w-2xl'}
                `}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                <Compass className="w-[18px] h-[18px] text-green-500" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Course Discovery</h2>
                                <p className="text-xs text-gray-500">{semester} · UT Dallas</p>
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

                    <div className="px-5 py-3 border-b border-gray-200 flex-shrink-0">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search courses, topics, professors, keywords…"
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

                    {(selectedSchool !== 'All' || activeTopic || selectedPrefixes.length > 0 || selectedCredits.length > 0 || modeFilter !== 'all' || coreOnly) && (
                        <div className="px-5 py-1.5 flex items-center gap-2 flex-wrap border-b border-gray-100 flex-shrink-0">
                            <span className="text-xs text-gray-400">Active:</span>
                            {selectedSchool !== 'All' && (
                                <button onClick={() => handleSchoolChange('All')}
                                    className="text-xs bg-green-100 text-green-700 rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1 hover:bg-green-200">
                                    {selectedSchool} <X className="w-2.5 h-2.5" />
                                </button>
                            )}
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
                            {modeFilter !== 'all' && (
                                <button onClick={() => setModeFilter('all')}
                                    className="text-xs bg-green-100 text-green-700 rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1 hover:bg-green-200">
                                    {modeFilter === 'online' ? 'Online' : modeFilter === 'hybrid' ? 'Hybrid' : 'In Person'} <X className="w-2.5 h-2.5" />
                                </button>
                            )}
                            {coreOnly && (
                                <button onClick={() => setCoreOnly(false)}
                                    className="text-xs bg-blue-100 text-blue-700 rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1 hover:bg-blue-200">
                                    Core req <X className="w-2.5 h-2.5" />
                                </button>
                            )}
                            {activeTopic && (
                                <button onClick={() => setActiveTopic(null)}
                                    className="text-xs bg-green-100 text-green-700 rounded-full px-2.5 py-0.5 font-medium flex items-center gap-1 hover:bg-green-200">
                                    {activeTopic} <X className="w-2.5 h-2.5" />
                                </button>
                            )}
                            <button onClick={clearAllFilters}
                                className="text-xs text-gray-400 hover:text-gray-600 ml-1 underline underline-offset-2">
                                Clear all
                            </button>
                        </div>
                    )}

                    {showFilters && (
                        <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50 flex-shrink-0 overflow-x-auto">
                            <div className="flex gap-4 items-start min-w-max">

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">School</span>
                                    <div className="flex gap-1 flex-wrap">
                                        {SCHOOLS.map(s => (
                                            <button key={s} onClick={() => handleSchoolChange(s)}
                                                className={`text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap
                                                    ${selectedSchool === s
                                                        ? 'bg-green-500 border-green-500 text-white font-medium'
                                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {selectedSchool !== 'All' && depts.length > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Dept</span>
                                        <div className="flex gap-1 flex-wrap">
                                            {depts.map(d => (
                                                <button key={d} onClick={() => setSelectedDept(d)}
                                                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap
                                                        ${selectedDept === d
                                                            ? 'bg-green-500 border-green-500 text-white font-medium'
                                                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}>
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {availablePrefixes.length > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Subject</span>
                                        <SubjectDropdown
                                            prefixes={availablePrefixes}
                                            selected={selectedPrefixes}
                                            onChange={setSelectedPrefixes}
                                        />
                                    </div>
                                )}

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Credits</span>
                                    <div className="flex gap-1">
                                        {['1', '2', '3', '4+'].map(c => (
                                            <button key={c}
                                                onClick={() => setSelectedCredits(prev =>
                                                    prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
                                                )}
                                                className={`text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap
                                                    ${selectedCredits.includes(c)
                                                        ? 'bg-green-500 border-green-500 text-white font-medium'
                                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}>
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Mode</span>
                                    <div className="flex gap-1">
                                        {[
                                            { value: 'all',      label: 'All'       },
                                            { value: 'inperson', label: 'In Person' },
                                            { value: 'online',   label: 'Online'    },
                                            { value: 'hybrid',   label: 'Hybrid'    },
                                        ].map(opt => (
                                            <button key={opt.value} onClick={() => setModeFilter(opt.value)}
                                                className={`text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap
                                                    ${modeFilter === opt.value
                                                        ? 'bg-green-500 border-green-500 text-white font-medium'
                                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Attributes</span>
                                    <button onClick={() => setCoreOnly(p => !p)}
                                        className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1 whitespace-nowrap
                                            ${coreOnly
                                                ? 'bg-green-500 border-green-500 text-white font-medium'
                                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}>
                                        <BookOpen className="w-3 h-3" /> Satisfies Core
                                    </button>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sort</span>
                                    <div className="flex gap-1">
                                        {SORT_OPTIONS.map(opt => (
                                            <button key={opt.value} onClick={() => setSortBy(opt.value)}
                                                className={`text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap
                                                    ${sortBy === opt.value
                                                        ? 'bg-green-500 border-green-500 text-white font-medium'
                                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}>
                                                {opt.value === 'grade'  && <TrendingUp className="w-3 h-3 inline mr-1 -mt-0.5" />}
                                                {opt.value === 'rating' && <Star       className="w-3 h-3 inline mr-1 -mt-0.5" />}
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {allTopics.length > 0 && (showFilters || selectedSchool !== 'All' || !!query) && (
                        <div className="px-5 py-2 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
                            <div className="flex gap-1.5 items-center min-w-max">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1 flex-shrink-0">Topic</span>
                                {allTopics.map(t => (
                                    <button key={t} onClick={() => setActiveTopic(activeTopic === t ? null : t)}
                                        className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap
                                            ${activeTopic === t
                                                ? 'bg-green-100 border-green-300 text-green-700 font-medium'
                                                : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-1 overflow-hidden">
                        <div className={`flex-1 overflow-y-auto min-w-0 ${rightPanel ? 'hidden sm:block' : ''}`}>
                            {!hasResults ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 px-8 py-12 text-center">
                                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                                        <Compass className="w-6 h-6 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Start exploring</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Search for anything — course names, topics, professors, or keywords like "machine learning" or "ethics"
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-xs">
                                        {['machine learning', 'databases', 'calculus', 'ethics'].map(hint => (
                                            <button key={hint} onClick={() => setQuery(hint)}
                                                className="text-xs border border-gray-200 rounded-md py-1.5 px-3 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                                                {hint}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : filteredCourses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-16">
                                    <AlertCircle className="w-6 h-6 opacity-30" />
                                    <p className="text-sm">No courses match your search</p>
                                    <button onClick={clearAllFilters} className="text-xs text-green-600 hover:underline">
                                        Clear filters
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4">
                                    <div className="text-xs text-gray-400 mb-3">
                                        {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
                                    </div>
                                    <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                                        {filteredCourses.map(course => (
                                            <CourseCard
                                                key={course.course_id}
                                                course={course}
                                                inCart={!!cart.find(i => i.course.course_id === course.course_id)}
                                                isSelected={selectedCourseId === course.course_id && rightPanel === 'detail'}
                                                onClick={() => openDetail(course.course_id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {rightPanel && (
                            <div className="w-full sm:w-[300px] flex-shrink-0 border-l border-gray-200 flex flex-col overflow-hidden bg-white relative">
                                <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                                    <span className="text-xs font-semibold text-gray-600">
                                        {rightPanel === 'detail'   && selectedCourse ? selectedCourse.course_code : ''}
                                        {rightPanel === 'cart'     ? 'Your Cart' : ''}
                                        {rightPanel === 'checkout' ? 'Checkout'  : ''}
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

                    <div className="px-5 py-2 bg-amber-50 border-t border-amber-100 flex-shrink-0">
                        <p className="text-[10px] text-amber-700 leading-relaxed">
                            Section availability is not real-time and is subject to change. Currently showing {semester} sections;
                            course offerings may be limited. Always verify openings in your university's official schedule planner before registering.
                        </p>
                    </div>

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