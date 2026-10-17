import React from "react";
import { GraduationCap } from "lucide-react";
import {
    useProgramRecommendations,
    type ProgramRecommendation,
} from "@/hooks/useProgramRecommendations";

interface ProgramRecommendationsProps {
    /** Changes whenever the transcript/evaluation changes, so the list refetches. */
    refreshKey?: unknown;
    /** Called when a row is clicked, e.g. to open the Edit plans flow. */
    onSelect?: (program: ProgramRecommendation) => void;
    className?: string;
}

const formatCredits = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const typeLabel = (r: ProgramRecommendation, showLevel: boolean) => {
    const type = r.program_type === "minor" ? "Minor" : "Certificate";
    if (!showLevel) return type;
    return `${r.education_level === "graduate" ? "Graduate" : "Undergraduate"} ${type.toLowerCase()}`;
};

const ProgramRecommendations: React.FC<ProgramRecommendationsProps> = ({
    refreshKey,
    onSelect,
    className = "",
}) => {
    const { status, recommendations } = useProgramRecommendations(refreshKey);

    if (status === "loading") {
        return (
            <div
                role="status"
                aria-label="Loading program recommendations"
                className={`mb-4 space-y-2 ${className}`}
            >
                <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
            </div>
        );
    }

    // Nothing worth showing (no results, not computed yet, or failed): stay out of the way.
    if (status !== "ready" || recommendations.length === 0) return null;

    // Only label the level when the list mixes undergrad and grad (e.g. fast-track students).
    const showLevel = new Set(recommendations.map((r) => r.education_level)).size > 1;

    return (
        <section aria-label="Program recommendations" className={`mb-4 ${className}`}>
            <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-4 h-4 text-green-600" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-gray-900">
                    Minors &amp; certificates you&apos;re close to
                </h3>
            </div>
            <p className="text-xs text-gray-500 mb-2">
                Based on courses you&apos;ve already taken. Click one to add it in Edit plans.
            </p>

            <ul className="space-y-2">
                {recommendations.map((r) => {
                    const pct = Math.max(0, Math.min(100, Math.round(r.completion_percentage)));
                    return (
                        <li key={`${r.education_level}-${r.program_type}-${r.name}`}>
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
                                    {r.remaining_credits === 1 ? "" : "s"} left
                                </div>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

export default ProgramRecommendations;