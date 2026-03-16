// Adapted from github.com/acmutd/utd-grades
import type { GradeDistribution } from "../types/grades";

const GRADE_KEYS = ["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F"] as const;
const GRADE_COLORS = [
  "#22c55e","#4ade80","#86efac","#bef264","#fde047",
  "#fb923c","#f97316","#ef4444","#dc2626","#b91c1c","#991b1b","#7f1d1d","#450a0a"
];

export function getColors(keys: string[]): string[] {
  const colorMap: Record<string, string> = Object.fromEntries(
    GRADE_KEYS.map((k, i) => [k, GRADE_COLORS[i]])
  );
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
  if (rating >= 3) return "#eab308";
  if (rating >= 2) return "#fb923c";
  return "#ef4444";
}

export function getAvgLetterGrade(grades: GradeDistribution): string {
  const gradePoints: Record<string, number> = {
    "A+": 4.0, "A": 4.0, "A-": 3.7,
    "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7,
    "D+": 1.3, "D": 1.0, "D-": 0.7,
    "F": 0.0,
  };
  let total = 0, count = 0;
  for (const [letter, n] of Object.entries(grades)) {
    total += (gradePoints[letter] ?? 0) * n;
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

export function getGpaBadgeStyle(avg: string): string {
  if (avg.startsWith("A")) return "bg-green-50 text-green-800";
  if (avg.startsWith("B")) return "bg-yellow-50 text-yellow-800";
  if (avg.startsWith("C")) return "bg-orange-50 text-orange-800";
  return "bg-red-50 text-red-800";
}