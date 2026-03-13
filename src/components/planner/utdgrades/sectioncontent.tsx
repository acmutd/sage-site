import { useState } from "react";
import { ExternalLink, Info } from "lucide-react";
import GradeChart from "@/components/planner/utdgrades/gradechart";
import {
  extractGrades,
  getAvgLetterGrade,
  getDifficultyColor,
  getRMPColor,
} from "@/utils/grades";
import type { Grades, RMPInstructor } from "@/types/grades";

type View = "aggregate" | "semester";

interface SectionContentProps {
  section: Grades;
  instructor: RMPInstructor | null;
  courseRating: number | null;
  relatedSections?: Grades[];
}

function StatCard({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-lg font-medium leading-none mb-1" style={color ? { color } : undefined}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function SectionContent({
  section,
  instructor,
  courseRating,
  relatedSections = [],
}: SectionContentProps) {
  const [view, setView] = useState<View>("aggregate");

  const aggGrades = extractGrades(section);

  // Combine all semesters for aggregate view
  const allSections = [section, ...relatedSections];

  const semesterRows = allSections.map((s) => ({
    label: `${s.semester.season} ${s.semester.year}`,
    grades: extractGrades(s),
    avg: getAvgLetterGrade(s),
    n: s.totalStudents,
  }));

  const tags = instructor?.tags ? instructor.tags.split(",").map((t) => t.trim()) : [];

  return (
    <div className="p-4 border-t border-border space-y-4">

      {/* Grade distribution */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Grade distribution
          </span>
          <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
            {(["aggregate", "semester"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                  view === v
                    ? "bg-background text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "aggregate" ? "All time" : "By semester"}
              </button>
            ))}
          </div>
        </div>

        {view === "aggregate" ? (
          <GradeChart grades={aggGrades} totalStudents={section.totalStudents} height={180} />
        ) : (
          <div className="space-y-3">
            {semesterRows.map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{row.label}</span>
                <div className="flex-1">
                  <GradeChart grades={row.grades} totalStudents={row.n} height={44} />
                </div>
                <span className="text-xs font-medium w-6 text-right shrink-0">{row.avg}</span>
                <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
                  n={row.n}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Professor details */}
      {instructor && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <a
              href={instructor.url ?? "#"}
              target={instructor.url ? "_blank" : "_self"}
              rel="noreferrer"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              Professor details
              {instructor.url && <ExternalLink className="w-3 h-3" />}
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard
              value={instructor.quality_rating?.toString() ?? "N/A"}
              label="RMP score"
              color={instructor.quality_rating ? getRMPColor(instructor.quality_rating) : undefined}
            />
            <StatCard
              value={instructor.difficulty_rating?.toString() ?? "N/A"}
              label="Difficulty"
              color={instructor.difficulty_rating ? getDifficultyColor(instructor.difficulty_rating) : undefined}
            />
            <StatCard
              value={instructor.would_take_again != null ? `${instructor.would_take_again}%` : "N/A"}
              label="Would retake"
            />
            <StatCard
              value={instructor.ratings_count?.toString() ?? "N/A"}
              label="Ratings"
            />
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Course rating */}
      {courseRating != null && (
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-xs text-muted-foreground">Course rating</span>
          <span className="text-xs font-medium">{courseRating}/5</span>
          <span title="Average student grade for this instructor in this course">
            <Info className="w-3 h-3 text-muted-foreground" />
          </span>
        </div>
      )}

      {/* Attribution */}
      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        Grade data by{" "}
        <a
          href="https://utdgrades.com"
          target="_blank"
          rel="noreferrer"
          className="text-green-600 hover:text-green-500 font-medium"
        >
          UTD Grades
        </a>{" "}
        · Ratings from{" "}
        <a
          href="https://ratemyprofessors.com"
          target="_blank"
          rel="noreferrer"
          className="text-blue-500 hover:text-blue-400 font-medium"
        >
          RateMyProfessors
        </a>
      </p>
    </div>
  );
}