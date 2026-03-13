// Adapted from github.com/acmutd/utd-grades
import type { Grades } from "@/types/grades";

export interface UserFriendlyGrades {
  "A+": number;
  A: number;
  "A-": number;
  "B+": number;
  B: number;
  "B-": number;
  "C+": number;
  C: number;
  "C-": number;
  "D+": number;
  D: number;
  "D-": number;
  F: number;
}

export function extractGrades(section: Grades): UserFriendlyGrades {
  return {
    "A+": section.aPlus,
    A: section.a,
    "A-": section.aMinus,
    "B+": section.bPlus,
    B: section.b,
    "B-": section.bMinus,
    "C+": section.cPlus,
    C: section.c,
    "C-": section.cMinus,
    "D+": section.dPlus,
    D: section.d,
    "D-": section.dMinus,
    F: section.f,
  };
}

export function getColors(keys: string[]): string[] {
  const colorMap: Record<string, string> = {
    "A+": "#22c55e",
    A:   "#4ade80",
    "A-": "#86efac",
    "B+": "#bef264",
    B:   "#fde047",
    "B-": "#fb923c",
    "C+": "#f97316",
    C:   "#ef4444",
    "C-": "#dc2626",
    "D+": "#b91c1c",
    D:   "#991b1b",
    "D-": "#7f1d1d",
    F:   "#450a0a",
  };
  return keys.map((k) => colorMap[k] ?? "#888");
}

export function getDifficultyColor(difficulty: number): string {
  if (difficulty <= 1) return "#22c55e";
  if (difficulty <= 2) return "#4ade80";
  if (difficulty <= 3) return "#fde047";
  if (difficulty <= 4) return "#fb923c";
  return "#ef4444";
}

export function getRMPColor(rating: number): string {
  if (rating >= 4.5) return "#22c55e";
  if (rating >= 3.75) return "#4ade80";
  if (rating >= 3) return "#fde047";
  if (rating >= 2) return "#fb923c";
  return "#ef4444";
}

export function getAvgLetterGrade(section: Grades): string {
  const grades = extractGrades(section);
  const gradePoints: Record<string, number> = {
    "A+": 4.0, A: 4.0, "A-": 3.7,
    "B+": 3.3, B: 3.0, "B-": 2.7,
    "C+": 2.3, C: 2.0, "C-": 1.7,
    "D+": 1.3, D: 1.0, "D-": 0.7,
    F: 0.0,
  };
  let total = 0, count = 0;
  for (const [letter, n] of Object.entries(grades)) {
    total += gradePoints[letter] * n;
    count += n;
  }
  if (count === 0) return "N/A";
  const avg = total / count;
  if (avg >= 3.85) return "A";
  if (avg >= 3.5)  return "A-";
  if (avg >= 3.15) return "B+";
  if (avg >= 2.85) return "B";
  if (avg >= 2.5)  return "B-";
  if (avg >= 2.15) return "C+";
  if (avg >= 1.85) return "C";
  return "C-";
}