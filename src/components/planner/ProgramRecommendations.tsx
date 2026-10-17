import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import {
    useProgramRecommendations,
    type ProgramRecommendation,
} from "@/hooks/useProgramRecommendations";

interface ProgramRecommendationsProps {
    /** Changes whenever the transcript/evaluation changes, so the list refetches. */
    refreshKey?: unknown;
    /** Called when the card is clicked, e.g. to open the Edit plans flow. */
    onSelect?: (program: ProgramRecommendation) => void;
    className?: string;
}

export const COLLAPSED_STORAGE_KEY = "sage:program-recs-collapsed";

// Per-browser convenience only; storage can be blocked or throw, so never depend on it.
const readCollapsed = (): boolean => {
    try {
        return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
    } catch {
        return false;
    }
};

const writeCollapsed = (value: boolean) => {
    try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, value ? "1" : "0");
    } catch {
        /* ignore */
    }
};

const formatCredits = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const typeLabel = (r: ProgramRecommendation, showLevel: boolean) => {
    const type = r.program_type === "minor" ? "Minor" : "Certificate";
    if (!showLevel) return type;
    return `${r.education_level === "graduate" ? "Graduate" : "Undergraduate"} ${type.toLowerCase()}`;
};

/**
 * Collapsible: expanded on a student's first visit (so everyone sees it once), then it
 * remembers their choice. Collapsed, the header shows a one-line teaser of the top pick.
 *
 * Shows one recommendation at a time (same prev/next + dots pattern as CoursesCarousel)
 * so the card stays one row tall and the degree requirements below it stay on screen.
 */
const ProgramRecommendations: React.FC<ProgramRecommendationsProps> = ({
    refreshKey,
    onSelect,
    className = "",
}) => {
    const { status, recommendations } = useProgramRecommendations(refreshKey);
    const [index, setIndex] = useState(0);
    const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);

    const toggle = () => {
        setCollapsed((prev) => {
            writeCollapsed(!prev);
            return !prev;
        });
    };

    // Fresh results start back at the first card.
    useEffect(() => {
        setIndex(0);
    }, [recommendations]);

    if (status === "loading") {
        return (
            <div
                role="status"
                aria-label="Loading program recommendations"
                className={`mb-4 space-y-2 ${className}`}
            >
                <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />
            </div>
        );
    }

    // Nothing worth showing (no results, not computed yet, or failed): stay out of the way.
    if (status !== "ready" || recommendations.length === 0) return null;

    const total = recommendations.length;
    const current = Math.max(0, Math.min(index, total - 1));
    const r = recommendations[current];
    const goTo = (i: number) => setIndex(Math.max(0, Math.min(i, total - 1)));

    // Only label the level when the list mixes undergrad and grad (e.g. fast-track students).
    const showLevel = new Set(recommendations.map((x) => x.education_level)).size > 1;
    const pct = Math.max(0, Math.min(100, Math.round(r.completion_percentage)));
    const top = recommendations[0];
    const topPct = Math.max(0, Math.min(100, Math.round(top.completion_percentage)));

    const navButton = (disabled: boolean) =>
        `transition-colors ${disabled ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:text-gray-900"
        }`;

    return (
        <section
            aria-label="Program recommendations"
            aria-roledescription="carousel"
            className={`mb-4 ${className}`}
        >
            <button
                type="button"
                onClick={toggle}
                aria-expanded={!collapsed}
                aria-controls="program-recs-body"
                className="w-full flex items-center gap-2 mb-2 text-left"
            >
                <GraduationCap className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden="true" />
                {collapsed ? (
                    <span className="flex-1 min-w-0 flex items-baseline gap-1 text-sm">
                        <span className="font-semibold text-gray-900 truncate">{top.name}</span>
                        <span className="text-green-700 font-semibold flex-shrink-0">· {topPct}%</span>
                        {total > 1 && (
                            <span className="text-xs text-gray-500 flex-shrink-0">+{total - 1} more</span>
                        )}
                    </span>
                ) : (
                    <h3 className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">
                        Minors &amp; certificates you&apos;re close to
                    </h3>
                )}
                {!collapsed && total > 1 && (
                    <span className="text-xs text-gray-500 flex-shrink-0" aria-live="polite">
                        {current + 1} / {total}
                    </span>
                )}
                <ChevronDown
                    aria-hidden="true"
                    className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${collapsed ? "" : "rotate-180"
                        }`}
                />
            </button>

            {!collapsed && (
                <div id="program-recs-body">
                    <div role="group" aria-roledescription="slide" aria-label={`${current + 1} of ${total}`}>
                        <button
                            type="button"
                            onClick={() => onSelect?.(r)}
                            className="w-full text-left bg-white border border-gray-200 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate" title={r.name}>
                                        {r.name}
                                    </div>
                                    <div className="text-[11px] text-gray-500">{typeLabel(r, showLevel)}</div>
                                </div>
                                <span className="text-sm font-semibold text-green-700 flex-shrink-0">{pct}%</span>
                            </div>

                            <div
                                role="progressbar"
                                aria-label={`${r.name} completion`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={pct}
                                className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden"
                            >
                                <div
                                    className="h-full rounded-full bg-green-500 transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>

                            <div className="mt-1 text-[11px] text-gray-500">
                                {formatCredits(r.remaining_credits)} credit hour
                                {r.remaining_credits === 1 ? "" : "s"} left · Add in Edit plans
                            </div>
                        </button>
                    </div>

                    {total > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => goTo(current - 1)}
                                disabled={current === 0}
                                className={navButton(current === 0)}
                                aria-label="Previous recommendation"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex gap-1.5 mx-1">
                                {recommendations.map((rec, i) => (
                                    <button
                                        key={`${rec.education_level}-${rec.program_type}-${rec.name}`}
                                        type="button"
                                        onClick={() => goTo(i)}
                                        aria-label={`Show recommendation ${i + 1}`}
                                        aria-current={i === current ? "true" : undefined}
                                        className={`transition-all duration-200 ${i === current
                                                ? "w-6 h-2 rounded-full bg-green-400"
                                                : "w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400"
                                            }`}
                                    />
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => goTo(current + 1)}
                                disabled={current === total - 1}
                                className={navButton(current === total - 1)}
                                aria-label="Next recommendation"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default ProgramRecommendations;