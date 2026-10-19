import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/utils/auth";

export interface ProgramRecommendation {
    name: string;
    program_type: "minor" | "certificate";
    education_level: "undergraduate" | "graduate";
    completion_percentage: number;
    credits_completed: number;
    credits_required: number;
    remaining_credits: number;
}

export type RecommendationStatus = "idle" | "loading" | "ready" | "empty" | "error";

interface State {
    status: RecommendationStatus;
    recommendations: ProgramRecommendation[];
}

const isRecommendation = (r: any): r is ProgramRecommendation =>
    !!r &&
    typeof r.name === "string" &&
    (r.program_type === "minor" || r.program_type === "certificate") &&
    (r.education_level === "undergraduate" || r.education_level === "graduate") &&
    Number.isFinite(r.completion_percentage) &&
    Number.isFinite(r.remaining_credits);

export function useProgramRecommendations(refreshKey?: unknown): State {
    const { user } = useAuth();
    const [state, setState] = useState<State>({ status: "idle", recommendations: [] });

    useEffect(() => {
        if (!user?.uid) {
            setState({ status: "idle", recommendations: [] });
            return;
        }

        let active = true;
        const controller = new AbortController();

        // Keep whatever is already on screen while refetching; only show the
        // loading state the first time.
        setState((prev) =>
            prev.recommendations.length > 0 ? prev : { status: "loading", recommendations: [] }
        );

        (async () => {
            try {
                const api = import.meta.env.VITE_EVALUATOR_API as string | undefined;
                if (!api) throw new Error("VITE_EVALUATOR_API is not set");

                const token = await getToken(user);
                const res = await fetch(api, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: user.uid, token, action: "get_program_recommendations" }),
                    signal: controller.signal,
                });
                if (!active) return;

                if (res.status === 404) {
                    setState({ status: "empty", recommendations: [] });
                    return;
                }
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data = await res.json();
                if (!active) return;

                const list: ProgramRecommendation[] = Array.isArray(data?.candidates)
                    ? data.candidates.filter(isRecommendation)
                    : [];
                setState({ status: list.length > 0 ? "ready" : "empty", recommendations: list });
            } catch (err: any) {
                if (!active || err?.name === "AbortError") return;
                console.error("Failed to load program recommendations:", err);
                setState({ status: "error", recommendations: [] });
            }
        })();

        return () => {
            active = false;
            controller.abort();
        };
    }, [user, refreshKey]);

    return state;
}