import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import SectionContent from "@/components/planner/utdgrades/sectioncontent";
import { getAvgLetterGrade, getRMPColor, getGpaBadgeStyle } from "@/utils/grades";
import type { InstructorGrades } from "@/types/grades";

interface CoursebookSection {
  course_prefix: string;
  course_number: string;
  section: string;
  class_number: string;
  instructors: string;
  activity_type: string;
  days: string;
  times_12h: string;
  location: string;
}

interface SectionCardProps {
  sec: CoursebookSection;
  instData: InstructorGrades | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_ABBR: Record<string, string> = {
  Monday: "M", Tuesday: "Tu", Wednesday: "W", Thursday: "Th", Friday: "F"
};

export default function SectionCard({ sec, instData }: SectionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const avg = instData ? getAvgLetterGrade(instData.aggregate.grades) : null;
  const rmp = instData?.instructor?.rmp?.quality_rating ?? null;
  const wouldRetake = instData?.instructor?.rmp?.would_take_again ?? null;
  const activeDays = new Set(sec.days?.split(",").map(d => d.trim()) ?? []);

  return (
    <div className={cn("rounded-xl border border-border bg-card transition-all", expanded && "ring-1 ring-border")}>
      <button
        className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors rounded-xl"
        onClick={() => setExpanded(p => !p)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {sec.course_prefix?.toUpperCase()} {sec.course_number}.{sec.section?.trim()}
            </span>
            <span className="text-xs text-muted-foreground">#{sec.class_number}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sec.instructors?.split(",")[0].trim()} · {sec.activity_type}
          </p>
          <div className="flex gap-1 mt-1.5">
            {DAYS.map(d => (
              <span key={d} className={cn(
                "w-5 h-5 rounded-sm text-[9px] flex items-center justify-center font-medium",
                activeDays.has(d) ? "bg-green-400 text-green-900" : "bg-muted text-muted-foreground"
              )}>
                {DAY_ABBR[d]}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {sec.times_12h?.split(";")[0].trim()} · {sec.location?.replace("_", " ")}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex gap-1.5 items-center">
            {avg ? (
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", getGpaBadgeStyle(avg))}>
                {avg} avg
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">No data</span>
            )}
            {rmp && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50" style={{ color: getRMPColor(rmp) }}>
                {rmp} ★
              </span>
            )}
          </div>
          {wouldRetake != null && (
            <span className="text-xs text-muted-foreground">{wouldRetake}% would retake</span>
          )}
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded && instData && <SectionContent instData={instData} />}
      {expanded && !instData && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">No grade or RMP data available for this instructor.</p>
        </div>
      )}
    </div>
  );
}