// adapted from acmutd's utdgrades 

export interface Semester {
    season: "Fall" | "Spring" | "Summer";
    year: number;
  }
  
  export interface Instructor {
    first: string;
    last: string;
  }
  
  export interface Grades {
    id: number;
    subject: string;
    catalogNumber: string;
    section: string;
    totalStudents: number;
    semester: Semester;
    instructor1: Instructor | null;
    // grade counts
    aPlus: number;
    a: number;
    aMinus: number;
    bPlus: number;
    b: number;
    bMinus: number;
    cPlus: number;
    c: number;
    cMinus: number;
    dPlus: number;
    d: number;
    dMinus: number;
    f: number;
    cr: number;
    nc: number;
    p: number;
    w: number;
    i: number;
    nf: number;
  }
  
  export interface RMPInstructor {
    id: string;
    first: string;
    last: string;
    url?: string;
    quality_rating: number | null;
    difficulty_rating: number | null;
    would_take_again: number | null;
    ratings_count: number | null;
    tags: string | null; // comma-separated
  }
  
  // Shape returned by your getUTDGrades() endpoint
  export interface SectionGradesData {
    section: Grades;
    instructor: RMPInstructor | null;
    courseRating: number | null;
    relatedSections?: Grades[]; // other semesters same prof + course
  }