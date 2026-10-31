import { describe, expect, it, vi } from "vitest";
import { createApiAdminAccess } from "./apiAdminAccess";

const BASE = "https://api.example.com/prod";

function access(response: Partial<Response> | Error) {
  const fetchImpl = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response as Response;
  });
  return { fetchImpl, access: createApiAdminAccess(async () => "id-token", BASE, fetchImpl as typeof fetch) };
}

const json = (status: number, body: unknown): Partial<Response> => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});

describe("createApiAdminAccess", () => {
  it("asks GET /me with the ID token as a bearer token", async () => {
    const { access: api, fetchImpl } = access(json(200, { tier: 2 }));

    await api.getMyTier();

    expect(fetchImpl).toHaveBeenCalledWith(`${BASE}/me`, { headers: { Authorization: "Bearer id-token" } });
  });

  it("ignores a trailing slash on the base URL", async () => {
    const fetchImpl = vi.fn(async () => json(200, { tier: 1 }) as Response);
    await createApiAdminAccess(async () => "t", `${BASE}/`, fetchImpl as typeof fetch).getMyTier();

    expect(fetchImpl).toHaveBeenCalledWith(`${BASE}/me`, expect.anything());
  });

  it.each([
    [1, "suggest"],
    [2, "admin"],
  ])("maps backend tier %s to %s", async (level, tier) => {
    await expect(access(json(200, { tier: level })).access.getMyTier()).resolves.toBe(tier);
  });

  it.each([{ tier: 0 }, { tier: 3 }, { tier: "2" }, {}, null])("denies an unrecognised tier %j", async (body) => {
    await expect(access(json(200, body)).access.getMyTier()).resolves.toBe("none");
  });

  it("maps a 403 to none", async () => {
    await expect(access(json(403, { error: "Unauthorized" })).access.getMyTier()).resolves.toBe("none");
  });

  it.each([401, 500, 502])("rejects on a %s instead of reading it as not allowed", async (status) => {
    await expect(access(json(status, {})).access.getMyTier()).rejects.toThrow(String(status));
  });

  it("rejects on a network failure", async () => {
    await expect(access(new Error("offline")).access.getMyTier()).rejects.toThrow("offline");
  });

  it("rejects when the API URL is not configured", async () => {
    await expect(createApiAdminAccess(async () => "t", undefined).getMyTier()).rejects.toThrow("VITE_ADMIN_API");
  });
});
