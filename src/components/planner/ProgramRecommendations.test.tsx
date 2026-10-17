import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import ProgramRecommendations from "./ProgramRecommendations";

let mockUser: any;

vi.mock("@/firebase-config", () => ({ auth: {} }));

vi.mock("@/context/AuthContext", () => ({
    useAuth: () => ({ user: mockUser }),
}));

const rec = (over: Record<string, unknown> = {}) => ({
    name: "Statistics",
    program_type: "minor",
    education_level: "undergraduate",
    completion_percentage: 70,
    credits_completed: 14,
    credits_required: 20,
    remaining_credits: 6,
    ...over,
});

const okResponse = (candidates: unknown[]) => ({
    ok: true,
    status: 200,
    json: async () => ({ candidates, catalog_year: 2025 }),
});

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_EVALUATOR_API", "http://localhost:3000/evaluator");
    mockUser = { uid: "test-user-123", getIdToken: vi.fn().mockResolvedValue("fresh-token") };
    global.fetch = vi.fn().mockResolvedValue(okResponse([])) as any;
});

afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
});

describe("fetching", () => {
    test("posts the read action with the student id and token", async () => {
        render(<ProgramRecommendations />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

        const [url, init] = (global.fetch as any).mock.calls[0];
        expect(url).toBe("http://localhost:3000/evaluator");
        expect(init.method).toBe("POST");
        expect(JSON.parse(init.body)).toEqual({
            id: "test-user-123",
            token: "fresh-token",
            action: "get_program_recommendations",
        });
    });

    test("does not fetch when signed out", async () => {
        mockUser = null;
        render(<ProgramRecommendations />);
        await Promise.resolve();
        expect(global.fetch).not.toHaveBeenCalled();
        expect(screen.queryByRole("region")).not.toBeInTheDocument();
    });

    test("refetches when refreshKey changes", async () => {
        const { rerender } = render(<ProgramRecommendations refreshKey={1} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

        rerender(<ProgramRecommendations refreshKey={2} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    });
});

describe("rendering", () => {
    test("shows a loading state first", async () => {
        let resolve!: (v: unknown) => void;
        global.fetch = vi.fn().mockReturnValue(new Promise((r) => (resolve = r))) as any;

        render(<ProgramRecommendations />);
        expect(await screen.findByRole("status", { name: /loading/i })).toBeInTheDocument();

        resolve(okResponse([rec()]));
        await screen.findByText("Statistics");
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    test("renders ranked rows with percent and credits left", async () => {
        global.fetch = vi.fn().mockResolvedValue(
            okResponse([
                rec({ name: "Statistics", completion_percentage: 70, remaining_credits: 6 }),
                rec({
                    name: "Cyber Defense",
                    program_type: "certificate",
                    completion_percentage: 40,
                    remaining_credits: 1,
                }),
            ])
        ) as any;

        render(<ProgramRecommendations />);

        const bars = await screen.findAllByRole("progressbar");
        expect(bars).toHaveLength(2);
        expect(bars[0]).toHaveAttribute("aria-valuenow", "70");
        expect(bars[1]).toHaveAttribute("aria-valuenow", "40");

        expect(screen.getByText("70%")).toBeInTheDocument();
        expect(screen.getByText(/6 credit hours left/i)).toBeInTheDocument();
        expect(screen.getByText(/1 credit hour left/i)).toBeInTheDocument();
        expect(screen.getByText("Minor")).toBeInTheDocument();
        expect(screen.getByText("Certificate")).toBeInTheDocument();
    });

    test("only labels the level when undergrad and grad are mixed", async () => {
        global.fetch = vi.fn().mockResolvedValue(
            okResponse([
                rec({ name: "Statistics" }),
                rec({ name: "Data Science", program_type: "certificate", education_level: "graduate" }),
            ])
        ) as any;

        render(<ProgramRecommendations />);
        expect(await screen.findByText("Undergraduate minor")).toBeInTheDocument();
        expect(screen.getByText("Graduate certificate")).toBeInTheDocument();
    });

    test("clamps out-of-range percentages", async () => {
        global.fetch = vi.fn().mockResolvedValue(
            okResponse([rec({ completion_percentage: 140 })])
        ) as any;

        render(<ProgramRecommendations />);
        expect(await screen.findByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    });

    test("ignores malformed entries", async () => {
        global.fetch = vi.fn().mockResolvedValue(
            okResponse([rec({ name: "Statistics" }), { name: "Broken" }, null])
        ) as any;

        render(<ProgramRecommendations />);
        expect(await screen.findByText("Statistics")).toBeInTheDocument();
        expect(screen.queryByText("Broken")).not.toBeInTheDocument();
    });
});

describe("quiet states", () => {
    test("renders nothing on 404 (not computed yet)", async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }) as any;
        render(<ProgramRecommendations />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
        expect(screen.queryByRole("region")).not.toBeInTheDocument();
    });

    test("renders nothing when there are no candidates", async () => {
        render(<ProgramRecommendations />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
        expect(screen.queryByRole("region")).not.toBeInTheDocument();
    });

    test("fails quietly on a network error", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => { });
        global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as any;

        render(<ProgramRecommendations />);
        await waitFor(() => expect(spy).toHaveBeenCalled());
        expect(screen.queryByRole("region")).not.toBeInTheDocument();
        spy.mockRestore();
    });

    test("fails quietly on a 500", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => { });
        global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }) as any;

        render(<ProgramRecommendations />);
        await waitFor(() => expect(spy).toHaveBeenCalled());
        expect(screen.queryByRole("region")).not.toBeInTheDocument();
        spy.mockRestore();
    });
});

describe("interaction", () => {
    test("clicking a row calls onSelect with that program", async () => {
        const onSelect = vi.fn();
        global.fetch = vi.fn().mockResolvedValue(okResponse([rec({ name: "Statistics" })])) as any;

        render(<ProgramRecommendations onSelect={onSelect} />);
        fireEvent.click(await screen.findByRole("button", { name: /statistics/i }));

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect.mock.calls[0][0]).toMatchObject({ name: "Statistics" });
    });
});