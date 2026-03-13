import { useState } from "react";
import { ExternalLink } from "lucide-react";
import GradeChart from "@/components/planner/utdgrades/gradechart";
import { getRMPColor, getDifficultyColor, getAvgLetterGrade } from "@/utils/grades";
import type { InstructorGrades } from "@/types/grades";

type View = "aggregate" | "semester";

interface SectionContentProps {
  instData: InstructorGrades;
}

function StatCard({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="bg-muted/100 rounded-md p-3">
      <p className="text-lg font-medium leading-none mb-1" style={color ? { color } : undefined}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function SectionContent({ instData }: SectionContentProps) {
  const [view, setView] = useState<View>("aggregate");

  const { instructor, semesters, aggregate } = instData;
  const rmp = instructor.rmp;
  const tags = rmp?.tags ?? [];

  const semesterRows = [...semesters].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : 0
  );

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
          <GradeChart grades={aggregate.grades} totalStudents={aggregate.totalStudents} height={180} />
        ) : (
          <div className="space-y-3">
            {semesterRows.map((sem) => (
              <div className="flex items-center gap-3">
                <div className="w-28 shrink-0">
                    <span className="text-xs text-muted-foreground">{sem.season} {sem.year}</span>
                    <p className="text-[10px] text-muted-foreground/60">{sem.totalStudents} students</p>
                    <p className="text-[10px] font-medium text-muted-foreground">
                        Avg: {getAvgLetterGrade(sem.grades)}
                    </p>
                </div>
                <div className="flex-1">
                    <GradeChart grades={sem.grades} totalStudents={sem.totalStudents} height={80} />
                </div>
            </div>
            ))}
          </div>
        )}
      </div>

      {/* Professor details */}
      {rmp && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <a
              href={rmp.url ?? "#"}
              target={rmp.url ? "_blank" : "_self"}
              rel="noreferrer"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              Professor details
              {rmp.url && <ExternalLink className="w-3 h-3" />}
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard
              value={rmp.quality_rating?.toString() ?? "N/A"}
              label="RMP score"
              color={rmp.quality_rating ? getRMPColor(rmp.quality_rating) : undefined}
            />
            <StatCard
              value={rmp.difficulty_rating?.toString() ?? "N/A"}
              label="Difficulty"
              color={rmp.difficulty_rating ? getDifficultyColor(rmp.difficulty_rating) : undefined}
            />
            <StatCard
              value={rmp.would_take_again != null ? `${rmp.would_take_again}%` : "N/A"}
              label="Would retake"
            />
            <StatCard
              value={rmp.ratings_count?.toString() ?? "N/A"}
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

      {/* Attribution */}
      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        Powered by{" "}
        <a href="https://utdgrades.com" target="_blank" rel="noreferrer" className="text-green-600 hover:text-green-500 font-medium">
          UTD Grades
        </a>
      </p>
    </div>
  );
}