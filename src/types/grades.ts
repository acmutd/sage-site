export interface GradeDistribution {
  "A+": number;
  "A": number;
  "A-": number;
  "B+": number;
  "B": number;
  "B-": number;
  "C+": number;
  "C": number;
  "C-": number;
  "D+": number;
  "D": number;
  "D-": number;
  "F": number;
  "W": number;
}

export interface SemesterRecord {
  season: "Fall" | "Spring" | "Summer";
  year: number;
  grades: GradeDistribution;
  totalStudents: number;
}

export interface RMPData {
  url: string | null;
  quality_rating: number | null;
  difficulty_rating: number | null;
  would_take_again: number | null;
  ratings_count: number | null;
  tags: string[];
}

export interface InstructorRecord {
  name: string;
  rmp: RMPData | null;
}

export interface InstructorGrades {
  instructor: InstructorRecord;
  semesters: SemesterRecord[];
  aggregate: {
    grades: GradeDistribution;
    totalStudents: number;
  };
}

export interface CourseGradesResponse {
  instructors: InstructorGrades[];
}