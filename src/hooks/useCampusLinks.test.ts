import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const auth = vi.hoisted(() => ({ user: { uid: "u1" } as any }));
const api = vi.hoisted(() => ({ getCampusLinks: vi.fn() }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock("@/utils/campusLinks", async () => {
    const real = await vi.importActual<typeof import("@/utils/campusLinks")>("@/utils/campusLinks");
    return { ...real, getCampusLinks: api.getCampusLinks };
});

import { useCampusLinks } from "./useCampusLinks";

describe("useCampusLinks", () => {
    beforeEach(() => { api.getCampusLinks.mockReset(); auth.user = { uid: "u1" }; });

    it("asks once for unseen rooms, returns their links, and does not ask again", async () => {
        api.getCampusLinks.mockResolvedValue({ "HOOK_1.101": { roomUrl: "r" } });
        const { result, rerender } = renderHook(() => useCampusLinks(["HOOK_1.101", "HOOK_1.101"]));
        await waitFor(() => expect(result.current["HOOK_1.101"]).toEqual({ roomUrl: "r" }));
        expect(api.getCampusLinks).toHaveBeenCalledTimes(1);
        expect(api.getCampusLinks.mock.calls[0][0]).toEqual(["HOOK_1.101"]);
        rerender();
        expect(api.getCampusLinks).toHaveBeenCalledTimes(1);
    });

    it("sends the rooms of several rows as one request", async () => {
        api.getCampusLinks.mockResolvedValue({ "HOOK_3.1": { roomUrl: "a" }, "HOOK_3.2": null });
        const one = renderHook(() => useCampusLinks(["HOOK_3.1"]));
        const two = renderHook(() => useCampusLinks(["HOOK_3.2"]));
        await waitFor(() => expect(one.result.current["HOOK_3.1"]).toEqual({ roomUrl: "a" }));
        expect(api.getCampusLinks).toHaveBeenCalledTimes(1);
        expect(api.getCampusLinks.mock.calls[0][0].sort()).toEqual(["HOOK_3.1", "HOOK_3.2"]);
        expect(two.result.current).toEqual({}); // resolved to "no links"
    });

    it("does nothing when signed out, and a failure leaves it empty and retryable", async () => {
        auth.user = null;
        const out = renderHook(() => useCampusLinks(["HOOK_2.202"]));
        expect(api.getCampusLinks).not.toHaveBeenCalled();
        expect(out.result.current).toEqual({});
        out.unmount();

        auth.user = { uid: "u1" };
        api.getCampusLinks.mockResolvedValueOnce(null);
        const failed = renderHook(() => useCampusLinks(["HOOK_2.202"]));
        await waitFor(() => expect(api.getCampusLinks).toHaveBeenCalledTimes(1));
        expect(failed.result.current).toEqual({});
        failed.unmount();

        api.getCampusLinks.mockResolvedValueOnce({ "HOOK_2.202": { mapsUrl: "m" } });
        const retry = renderHook(() => useCampusLinks(["HOOK_2.202"]));
        await waitFor(() => expect(retry.result.current["HOOK_2.202"]).toEqual({ mapsUrl: "m" }));
    });
});
