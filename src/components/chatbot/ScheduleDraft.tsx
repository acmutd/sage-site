import { useState } from "react";
import { Copy, Check, CalendarDays } from "lucide-react";
import { CourseBlock, ScheduleVariant } from "@/types/chat";

interface Props {
  variants: ScheduleVariant[];
  messageIndex: number;
  conversationId: string | null;
}

const PALETTE = [
  { bg: "#fde8f0", border: "#f472b6", text: "#9d174d" },
  { bg: "#ede9fe", border: "#a78bfa", text: "#5b21b6" },
  { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  { bg: "#dbeafe", border: "#60a5fa", text: "#1e3a8a" },
  { bg: "#dcfce7", border: "#4ade80", text: "#166534" },
  { bg: "#fce7f3", border: "#f9a8d4", text: "#9d174d" },
];

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const GRID_START = 8;
const GRID_END = 20;
const GRID_HEIGHT = 260;
const PX_PER_HOUR = GRID_HEIGHT / (GRID_END - GRID_START);

const DAY_MAP: Record<string, string> = {
  mon: "MON", monday: "MON", m: "MON",
  tue: "TUE", tuesday: "TUE", tu: "TUE",
  wed: "WED", wednesday: "WED", w: "WED",
  thu: "THU", thursday: "THU", th: "THU", r: "THU",
  fri: "FRI", friday: "FRI", f: "FRI",
};

function normalizeDays(days: string[]): string[] {
  return days.flatMap(d => {
    const key = d.toLowerCase().trim();
    if (DAY_MAP[key]) return [DAY_MAP[key]];
    return d.toUpperCase().trim().split("").map(ch => DAY_MAP[ch.toLowerCase()] ?? "").filter(Boolean);
  });
}

function n(val: unknown): number {
  return Number(val) || 0;
}

function formatTime(h: number): string {
  const hr = Math.floor(h);
  const min = Math.round((h % 1) * 60);
  const ampm = hr >= 12 ? "pm" : "am";
  const display = hr > 12 ? hr - 12 : hr;
  return `${display}:${min === 0 ? "00" : String(min).padStart(2, "0")}${ampm}`;
}

function hasConflict(blocks: CourseBlock[]): boolean {
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i], b = blocks[j];
      const aDays = normalizeDays(a.days);
      const bDays = normalizeDays(b.days);
      const sharedDay = aDays.some(d => bDays.includes(d));
      if (sharedDay && n(a.start) < n(b.end) && n(b.start) < n(a.end)) return true;
    }
  }
  return false;
}

export default function ScheduleDraft({ variants }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!variants || variants.length === 0) return null;

  const activeVariant = variants[activeIndex];
  const blocks = activeVariant.blocks;
  const conflict = hasConflict(blocks);

  const courseColorMap: Record<string, typeof PALETTE[0]> = {};
  [...new Set(blocks.map(b => b.course))].forEach((course, i) => {
    courseColorMap[course] = PALETTE[i % PALETTE.length];
  });

  function copyText() {
    const text = blocks.map(b =>
      `${b.course} ${b.section} — ${normalizeDays(b.days).join("/")} ${formatTime(n(b.start))}–${formatTime(n(b.end))} | ${b.prof} | ${b.room}`
    ).join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="self-start mr-auto w-full max-w-2xl">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-accent">
          <CalendarDays size={14} className="stroke-textdark" />
        </div>
        <span className="text-sm font-medium text-textdark">Schedule Draft</span>
        <span className="text-xs text-textsecondary">— pick a style that works for you</span>
      </div>

      <div className="bg-innercontainer border border-border rounded-lg overflow-hidden">
        <div className="flex border-b border-border bg-bglight px-4 pt-3 gap-2">
          {variants.map((v, i) => (
            <button
              key={v.label}
              onClick={() => { setActiveIndex(i); setSelectedCourse(null); }}
              className={`relative px-4 py-2 text-sm rounded-t-md transition-colors duration-150 font-medium ${
                activeIndex === i
                  ? "bg-innercontainer text-textdark border border-b-0 border-border -mb-px"
                  : "text-textsecondary hover:text-textdark hover:bg-secondary"
              }`}
            >
              <span className="mr-1.5 text-xs font-bold opacity-50">
                {String.fromCharCode(65 + i)}
              </span>
              {v.label}
            </button>
          ))}
        </div>

        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm text-textdark bg-secondary px-3 py-2 rounded-md leading-relaxed">
            {activeVariant.reason}
          </p>

          <div className="flex flex-col gap-1">
            <span className={`text-xs font-semibold uppercase tracking-wider ${conflict ? "text-red-500" : "text-textsecondary"}`}>
              {conflict ? "Time conflict detected — try a different style" : "All sections — no conflicts"}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-textsecondary">
              Weekly View
            </span>
            <div className="bg-secondary rounded-md p-2">
              <div style={{ display: "flex", paddingLeft: 28, marginBottom: 3 }}>
                {DAYS.map(d => (
                  <div key={d} style={{
                    flex: 1, textAlign: "center", fontSize: 9, fontWeight: 700,
                    color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase",
                  }}>{d}</div>
                ))}
              </div>
              <div style={{ display: "flex" }}>
                <div style={{ width: 28, flexShrink: 0, position: "relative", height: GRID_HEIGHT }}>
                  {HOURS.map(h => (
                    <div key={h} style={{
                      position: "absolute", top: (h - GRID_START) * PX_PER_HOUR - 5,
                      right: 3, fontSize: 8, color: "#94a3b8",
                    }}>
                      {h > 12 ? `${h - 12}p` : `${h}a`}
                    </div>
                  ))}
                </div>
                <div style={{
                  flex: 1, position: "relative", height: GRID_HEIGHT,
                  borderRadius: 6, overflow: "hidden", background: "white",
                  border: "1px solid #f1f5f9",
                }}>
                  {HOURS.map(h => (
                    <div key={h} style={{
                      position: "absolute", left: 0, right: 0,
                      top: (h - GRID_START) * PX_PER_HOUR,
                      borderTop: "1px solid #f1f5f9",
                    }} />
                  ))}
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                      position: "absolute", top: 0, bottom: 0,
                      left: `${i * 20}%`, borderLeft: "1px solid #f1f5f9",
                    }} />
                  ))}
                  {blocks.flatMap(block => {
                    const normalizedDays = normalizeDays(block.days);
                    const start = n(block.start);
                    const end = n(block.end);
                    const colors = courseColorMap[block.course] ?? PALETTE[0];
                    const isSelected = selectedCourse === block.course;
                    return normalizedDays.filter(d => DAYS.includes(d)).map(day => {
                      const dayIndex = DAYS.indexOf(day);
                      const topPx = (start - GRID_START) * PX_PER_HOUR;
                      const heightPx = (end - start) * PX_PER_HOUR;
                      return (
                        <div
                          key={`${block.course}-${day}`}
                          onClick={() => setSelectedCourse(isSelected ? null : block.course)}
                          style={{
                            position: "absolute",
                            top: topPx + 1,
                            left: `calc(${dayIndex * 20}% + 2px)`,
                            width: "calc(20% - 4px)",
                            height: Math.max(heightPx - 2, 16),
                            background: colors.bg,
                            border: `1.5px solid ${isSelected ? colors.border : colors.border + "88"}`,
                            borderRadius: 4, padding: "2px 4px", cursor: "pointer", zIndex: 2,
                            transition: "all 0.15s",
                            boxShadow: isSelected ? `0 0 0 2px ${colors.border}` : "none",
                            overflow: "hidden",
                          }}
                        >
                          <div style={{ fontSize: 8, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>
                            {block.course}
                          </div>
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </div>
          </div>

          {selectedCourse && (() => {
            const block = blocks.find(b => b.course === selectedCourse);
            if (!block) return null;
            return (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-textsecondary">
                  Section Details
                </span>
                <div className="bg-secondary px-3 py-2 rounded-md">
                  <p className="text-sm font-semibold text-textdark">{block.course} — {block.section}</p>
                  <p className="text-xs text-textsecondary">{normalizeDays(block.days).join(" / ")} · {formatTime(n(block.start))} – {formatTime(n(block.end))}</p>
                  <p className="text-xs text-textsecondary">{block.prof} · {block.room}</p>
                </div>
              </div>
            );
          })()}

          <div className="flex flex-wrap gap-2">
            {blocks.map(b => {
              const colors = courseColorMap[b.course] ?? PALETTE[0];
              return (
                <button
                  key={b.course}
                  onClick={() => setSelectedCourse(b.course === selectedCourse ? null : b.course)}
                  style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                >
                  <div style={{ width: 6, height: 6, borderRadius: 2, background: colors.border }} />
                  {b.course} · {b.section}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end items-center px-5 py-3 border-t border-border bg-bglight">
          <button
            onClick={copyText}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors duration-150 text-sm text-textdark"
          >
            {copied ? <Check size={14} className="stroke-textdark" /> : <Copy size={14} className="stroke-textdark" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}