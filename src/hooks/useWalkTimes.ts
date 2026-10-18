import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchWalkTimes, toWalkPayload } from "@/utils/walkTimeApi";
import type { TimedSection, Transition } from "@/utils/walkTime";

const DEBOUNCE_MS = 400;

/** Answers already fetched this session, so flipping between sections does not re-ask. */
const cache = new Map<string, Transition[]>();

/**
 * Walking times between back-to-back classes of the selected sections, from the
 * server. Empty while loading, when signed out, or if the request fails.
 */
export function useWalkTimes(sections: TimedSection[]): { transitions: Transition[]; loading: boolean } {
    const { user } = useAuth();
    const uid = user?.uid ?? "";

    // what the server would see; its JSON is the cache key and the dependency
    const key = useMemo(() => (uid ? `${uid}|${JSON.stringify(toWalkPayload(sections))}` : ""), [uid, sections]);
    const hasPair = useMemo(() => toWalkPayload(sections).length >= 2, [sections]);

    const [state, setState] = useState<{ key: string; transitions: Transition[] }>({ key: "", transitions: [] });
    const latest = useRef(sections);
    latest.current = sections;

    useEffect(() => {
        if (!key || !hasPair) return;
        const hit = cache.get(key);
        if (hit) {
            setState({ key, transitions: hit });
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            const result = await fetchWalkTimes(latest.current, user, controller.signal);
            if (controller.signal.aborted) return;
            if (result) cache.set(key, result); // a failed request is not cached, so it can be retried
            setState({ key, transitions: result ?? [] });
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
        // `user` is represented by `uid` in `key`
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, hasPair]);

    const ready = key !== "" && hasPair;
    // never show rows from a different set of sections
    const transitions = ready && state.key === key ? state.transitions : [];
    return { transitions, loading: ready && state.key !== key };
}
