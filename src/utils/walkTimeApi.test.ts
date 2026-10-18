import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWalkTimes, parseWalkTimes, toWalkPayload } from "./walkTimeApi";

vi.mock("./auth", () => ({ getToken: vi.fn(async () => "tok-123") }));

const sec = (n: string, section: string, days: unknown, times_12h: unknown, location: unknown) => ({
    course_prefix: "CS", course_number: n, section, days, times_12h, location,
});

const A = sec("1337", "001", "Monday, Wednesday", "9:00 AM - 10:15 AM", "ECSS_2.306");
const B = sec("2336", "002", "Monday, Wednesday", "10:20 AM - 11:35 AM", "AD_3.200");

describe("toWalkPayload", () => {
    it("sends the shape the endpoint expects", () => {
        expect(toWalkPayload([A])).toEqual([
            {
                course_prefix: "CS", course_number: "1337", section: "001",
                days: ["Monday", "Wednesday"], times_12h: "9:00am - 10:15am", location: "ECSS 2.306",
            },
        ]);
    });

    it("accepts arrays, takes the first room and time, and drops sections with no room or time", () => {
        const payload = toWalkPayload([
            sec("1", "001", ["Tuesday"], ["1:00 PM - 2:15 PM; 3:00 PM - 4:00 PM"], "HH_2.402; ECSW_1.315"),
            sec("2", "001", "Monday", "TBA", "ECSS_2.306"),
            sec("3", "001", "Monday", "9:00 AM - 10:00 AM", "TBA"),
            sec("4", "001", "Monday", "9:00 AM - 10:00 AM", "ONLINE"),
        ]);
        expect(payload).toHaveLength(1);
        expect(payload[0]).toMatchObject({ days: ["Tuesday"], times_12h: "1:00pm - 2:15pm", location: "HH 2.402" });
    });

    it("sends the exact example from the endpoint's contract", () => {
        const [p] = toWalkPayload([sec("2336", "001", ["Monday", "Wednesday"], "10:00 AM - 11:15 AM", "ECSW 1.315")]);
        expect(p).toEqual({
            course_prefix: "CS", course_number: "2336", section: "001",
            days: ["Monday", "Wednesday"], times_12h: "10:00am - 11:15am", location: "ECSW 1.315",
        });
    });
});

describe("parseWalkTimes", () => {
    const sent = toWalkPayload([A, B]);
    const row = {
        day: "Monday",
        from: { course_prefix: "CS", course_number: "1337", section: "001" },
        to: { course_prefix: "CS", course_number: "2336", section: "002" },
        walk_minutes: 9, gap_minutes: 5, tight: true,
    };

    it("builds planner rows, taking times and rooms from the sections sent", () => {
        const [t] = parseWalkTimes({ transitions: [row] }, sent);
        expect(t).toMatchObject({ day: "Monday", walkMinutes: 9, gapMinutes: 5, tight: true, fromEnd: 615, toStart: 620 });
        expect(t.fromRoom.label).toBe("ECSS 2.306");
        expect(t.toRoom.label).toBe("AD 3.200");
    });

    it("accepts camelCase numbers, and works out tight when it is missing", () => {
        const [t] = parseWalkTimes({ transitions: [{ ...row, walk_minutes: undefined, gap_minutes: undefined, walkMinutes: 4, gapMinutes: 10, tight: undefined }] }, sent);
        expect(t).toMatchObject({ walkMinutes: 4, gapMinutes: 10, tight: false });
    });

    it("ignores rows it cannot place, and anything that is not the expected shape", () => {
        expect(parseWalkTimes({ transitions: [{ ...row, from: { course_prefix: "CS", course_number: "9999", section: "001" } }] }, sent)).toEqual([]);
        expect(parseWalkTimes({ transitions: [{ ...row, walk_minutes: "soon" }] }, sent)).toEqual([]);
        expect(parseWalkTimes({ error: "nope" }, sent)).toEqual([]);
        expect(parseWalkTimes(null, sent)).toEqual([]);
    });
});

describe("fetchWalkTimes", () => {
    const user = { uid: "u1" } as any;
    const ok = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

    beforeEach(() => vi.stubEnv("VITE_CRUD_API", "https://api.example.test/CRUD"));
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("POSTs userId, token, action and sections like the other CRUD calls", async () => {
        const fetchMock = vi.fn(async () => ok({ transitions: [] }));
        vi.stubGlobal("fetch", fetchMock);
        await fetchWalkTimes([A, B], user);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe("https://api.example.test/CRUD");
        expect(init.method).toBe("POST");
        const body = JSON.parse(init.body as string);
        expect(body).toMatchObject({ userId: "u1", token: "tok-123", action: "getWalkTimes" });
        expect(body.sections).toHaveLength(2);
    });

    it("does not call the server with fewer than two usable sections, or when signed out", async () => {
        const fetchMock = vi.fn(async () => ok({ transitions: [] }));
        vi.stubGlobal("fetch", fetchMock);
        expect(await fetchWalkTimes([A], user)).toEqual([]);
        expect(await fetchWalkTimes([A, B], null)).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns null (not a throw) when the request fails", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false }) as Response));
        expect(await fetchWalkTimes([A, B], user)).toBeNull();
        vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
        expect(await fetchWalkTimes([A, B], user)).toBeNull();
    });
});

describe("parseWalkTimes without usable from/to", () => {
    it("matches by day, end/start minute and room", () => {
        const sent = [
            { course_prefix: "CS", course_number: "1337", section: "001", days: ["Monday"], times_12h: "9:00am - 10:15am", location: "ECSS 2.306" },
            { course_prefix: "MATH", course_number: "2417", section: "002", days: ["Monday"], times_12h: "10:30am - 11:45am", location: "SOM 2.901" },
        ];
        const rows = parseWalkTimes({ transitions: [{
            day: "Monday", from: "whatever", to: null, from_room: "ECSS_2.306", to_room: "SOM_2.901",
            from_end: 615, to_start: 630, gap_minutes: 15, walk_minutes: 9, tight: false,
        }] }, sent);
        expect(rows).toHaveLength(1);
        expect(rows[0].from.course_number).toBe("1337");
        expect(rows[0].to.course_number).toBe("2417");
        expect(rows[0].walkMinutes).toBe(9);
    });
});
