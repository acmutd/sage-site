import React, { useEffect, useState } from "react";
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    GalleryHorizontal,
    GraduationCap,
    List,
} from "lucide-react";
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

export const VIEW_STORAGE_KEY = "sage:program-recs-view";

type Density = "compact" | "expanded";
interface ViewState {
    /** false = just the header. */
    open: boolean;
    /** compact = one-line list, expanded = card carousel. Remembered while closed. */
    density: Density;
}

// First visit: open, card view, so every student sees it once.
const DEFAULT_VIEW: ViewState = { open: true, density: "expanded" };

// Per-browser convenience only; storage can be blocked, throw, or hold junk, so never depend on it.
const readView = (): ViewState => {
    try {
        const raw = localStorage.getItem(VIEW_STORAGE_KEY);
        if (!raw) return DEFAULT_VIEW;
        const v = JSON.parse(raw);
        return {
            open: typeof v?.open === "boolean" ? v.open : DEFAULT_VIEW.open,
            density: v?.density === "compact" || v?.density === "expanded" ? v.density : DEFAULT_VIEW.density,
        };
    } catch {
        return DEFAULT_VIEW;
    }
};

const writeView = (view: ViewState) => {
    try {
        localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(view));
    } catch {
        /* ignore */
    }
};

// Grad students only get certificates, so don't tell them about minors.
const headerTitle = (recs: ProgramRecommendation[]) => {
    const types = new Set(recs.map((r) => r.program_type));
    if (types.size === 1) return types.has("minor") ? "Suggested minors" : "Suggested certificates";
    return "Suggested minors & certs";
};

const formatCredits = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const typeLabel = (r: ProgramRecommendation, showLevel: boolean) => {
    const type = r.program_type === "minor" ? "Minor" : "Certificate";
    if (!showLevel) return type;
    return `${r.education_level === "graduate" ? "Graduate" : "Undergraduate"} ${type.toLowerCase()}`;
};

/**
 * Three states, like Gmail's density setting:
 *   - collapsed: just the header (chevron toggles)
 *   - compact:   one line per recommendation
 *   - expanded:  one card at a time with prev/next + dots (same pattern as CoursesCarousel)
 * The chevron opens/closes; the small icon next to it switches compact <-> expanded.
 * The choice is remembered per browser.
 */
const ProgramRecommendations: React.FC<ProgramRecommendationsProps> = ({
    refreshKey,
    onSelect,
    className = "",
}) => {
    const { status, recommendations } = useProgramRecommendations(refreshKey);
    const [index, setIndex] = useState(0);
    const [view, setView] = useState<ViewState>(readView);

    const update = (patch: Partial<ViewState>) => {
        setView((prev) => {
            const next = { ...prev, ...patch };
            writeView(next);
            return next;
        });
    };
    const toggleOpen = () => update({ open: !view.open });
    const toggleDensity = () => update({ density: view.density === "compact" ? "expanded" : "compact" });

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
    const title = headerTitle(recommendations);
    const showLevel = new Set(recommendations.map((x) => x.education_level)).size > 1;
    const pct = Math.max(0, Math.min(100, Math.round(r.completion_percentage)));

    const navButton = (disabled: boolean) =>
        `transition-colors ${disabled ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:text-gray-900"
        }`;

    return (
        <section
            aria-label="Program recommendations"
            aria-roledescription="carousel"
            data-tour="program-recommendations"
            className={`mb-4 ${className}`}
        >
            <div className={`flex items-center gap-2 ${view.open ? "mb-2" : ""}`}>
                <button
                    type="button"
                    onClick={toggleOpen}
                    aria-expanded={view.open}
                    aria-controls="program-recs-body"
                    className="flex-1 min-w-0 flex items-center gap-2 text-left"
                >
                    <GraduationCap className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">{title}</h3>
                    {view.open && view.density === "expanded" && total > 1 && (
                        <span className="text-xs text-gray-500 flex-shrink-0" aria-live="polite">
                            {current + 1} / {total}
                        </span>
                    )}
                </button>

                {view.open && (
                    <button
                        type="button"
                        onClick={toggleDensity}
                        data-tour="program-recommendations-view"
                        aria-label={view.density === "compact" ? "Switch to card view" : "Switch to compact list"}
                        title={view.density === "compact" ? "Card view" : "Compact list"}
                        className="p-0.5 rounded text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0"
                    >
                        {view.density === "compact" ? (
                            <GalleryHorizontal className="w-4 h-4" aria-hidden="true" />
                        ) : (
                            <List className="w-4 h-4" aria-hidden="true" />
                        )}
                    </button>
                )}

                {/* Decorative: the title button above is the accessible toggle. */}
                <button
                    type="button"
                    onClick={toggleOpen}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="p-0.5 flex-shrink-0"
                >
                    <ChevronDown
                        className={`w-4 h-4 text-gray-500 transition-transform ${view.open ? "rotate-180" : ""}`}
                    />
                </button>
            </div>

            {!view.open ? null : view.density === "compact" ? (
                <ul id="program-recs-body" className="space-y-0" aria-label="Recommendations">
                    {recommendations.map((rec) => {
                        const p = Math.max(0, Math.min(100, Math.round(rec.completion_percentage)));
                        return (
                            <li key={`${rec.education_level}-${rec.program_type}-${rec.name}`}>
                                <button
                                    type="button"
                                    onClick={() => onSelect?.(rec)}
                                    title={`${rec.name} (${typeLabel(rec, true).toLowerCase()})`}
                                    className="w-full text-left rounded-lg px-2 py-0.5 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="text-sm font-semibold text-gray-900 truncate">{rec.name}</span>
                                        <span className="text-sm font-semibold text-green-700 flex-shrink-0">{p}%</span>
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : (
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