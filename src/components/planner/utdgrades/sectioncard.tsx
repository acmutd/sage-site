import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import SectionContent from "@/components/planner/utdgrades/sectioncontent";
import { getAvgLetterGrade, getRMPColor } from "@/utils/grades";
import type { Grades, RMPInstructor } from "@/types/grades";

interface SectionCardProps {
  section: Grades;
  instructor: RMPInstructor | null;
  courseRating: number | null;
  relatedSections?: Grades[];
}

const DAYS = ["M", "Tu", "W", "Th", "F"] as const;

// You'll want to pass actual schedule data — placeholder for now
interface ScheduleInfo {
  days: (typeof DAYS[number])[];
  startTime: string;
  endTime: string;
  room: string;
}

function GpaBadge({ avg }: { avg: string }) {
  const colorMap: Record<string, string> = {
    A: "bg-green-100 text-green-800",
    "A-": "bg-green-100 text-green-800",
    "B+": "bg-amber-100 text-amber-800",
    B: "bg-amber-100 text-amber-800",
    "B-": "bg-amber-100 text-amber-800",
    "C+": "bg-red-100 text-red-800",
    C: "bg-red-100 text-red-800",
  };
  const cls = colorMap[avg] ?? "bg-muted text-muted-foreground";
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cls)}>
      {avg} avg
    </span>
  );
}

function RmpBadge({ rating }: { rating: number | null }) {
  if (rating == null)
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
        No RMP
      </span>
    );
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-800"
      style={{ color: getRMPColor(rating) }}
    >
      {rating} ★ RMP
    </span>
  );
}

export default function SectionCard({
  section,
  instructor,
  courseRating,
  relatedSections,
  schedule,
}: SectionCardProps & { schedule?: ScheduleInfo }) {
  const [expanded, setExpanded] = useState(false);

  const avg = getAvgLetterGrade(section);
  const profName = section.instructor1
    ? `${section.instructor1.first} ${section.instructor1.last}`
    : "Staff";

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card transition-all",
        expanded && "ring-1 ring-border"
      )}
    >
      {/* Collapsed header */}
      <button
        className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors rounded-xl"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {section.subject} {section.catalogNumber}.{section.section}
            </span>
            <span className="text-xs text-muted-foreground">#{section.id}</span>
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">{profName} · Lecture</p>

          {schedule && (
            <>
              <div className="flex gap-1 mt-1.5">
                {DAYS.map((d) => (
                  <span
                    key={d}
                    className={cn(
                      "w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-medium",
                      schedule.days.includes(d)
                        ? "bg-green-400 text-green-900"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {d}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {schedule.startTime} – {schedule.endTime} · {schedule.room}
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex gap-1.5 items-center">
            <GpaBadge avg={avg} />
            <RmpBadge rating={instructor?.quality_rating ?? null} />
          </div>
          {instructor?.would_take_again != null && (
            <span className="text-xs text-muted-foreground">
              {instructor.would_take_again}% would retake
            </span>
          )}
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <SectionContent
          section={section}
          instructor={instructor}
          courseRating={courseRating}
          relatedSections={relatedSections}
        />
      )}
    </div>
  );
}