import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const auth = vi.hoisted(() => ({ user: { uid: "u1" } as any }));
const api = vi.hoisted(() => ({ fetchWalkTimes: vi.fn() }));

vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock("@/utils/walkTimeApi", async () => {
    const real = await vi.importActual<typeof import("@/utils/walkTimeApi")>("@/utils/walkTimeApi");
    return { ...real, fetchWalkTimes: api.fetchWalkTimes };
});

import { useWalkTimes } from "./useWalkTimes";

const sec = (n: string, loc: string, time: string) => ({
    course_prefix: "CS", course_number: n, section: "001", days: "Monday", times_12h: time, location: loc,
});
const row = { day: "Monday", walkMinutes: 9 } as any;

describe("useWalkTimes", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        api.fetchWalkTimes.mockReset();
        auth.user = { uid: "u1" };
    });
    afterEach(() => vi.useRealTimers());

    const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(500); });

    it("asks the server once after a short pause and returns its rows", async () => {
        api.fetchWalkTimes.mockResolvedValue([row]);
        const sections = [sec("1", "ECSS_2.306", "9:00 AM - 10:15 AM"), sec("2", "AD_3.200", "10:20 AM - 11:35 AM")];
        const { result } = renderHook(() => useWalkTimes(sections));

        expect(result.current.transitions).toEqual([]);
        expect(api.fetchWalkTimes).not.toHaveBeenCalled(); // debounced
        await flush();
        expect(api.fetchWalkTimes).toHaveBeenCalledTimes(1);
        expect(result.current.transitions).toEqual([row]);
    });

    it("does not ask when there is nothing to pair, or when signed out", async () => {
        const one = [sec("1", "ECSS_2.306", "9:00 AM - 10:15 AM")];
        renderHook(() => useWalkTimes(one));
        auth.user = null;
        const two = [sec("1", "ECSS_2.306", "9:00 AM - 10:15 AM"), sec("2", "AD_3.200", "10:20 AM - 11:35 AM")];
        renderHook(() => useWalkTimes(two));
        await flush();
        expect(api.fetchWalkTimes).not.toHaveBeenCalled();
    });

    it("remembers answers for the session, but retries after a failure", async () => {
        const sections = [sec("5", "ECSS_2.306", "9:00 AM - 10:15 AM"), sec("6", "AD_3.200", "10:20 AM - 11:35 AM")];

        api.fetchWalkTimes.mockResolvedValueOnce(null); // failed: shows nothing, not cached
        const first = renderHook(() => useWalkTimes(sections));
        await flush();
        expect(first.result.current.transitions).toEqual([]);
        first.unmount();

        api.fetchWalkTimes.mockResolvedValueOnce([row]);
        const second = renderHook(() => useWalkTimes(sections));
        await flush();
        expect(api.fetchWalkTimes).toHaveBeenCalledTimes(2);
        expect(second.result.current.transitions).toEqual([row]);
        second.unmount();

        const third = renderHook(() => useWalkTimes(sections)); // cached now
        await flush();
        expect(api.fetchWalkTimes).toHaveBeenCalledTimes(2);
        expect(third.result.current.transitions).toEqual([row]);
    });
});
