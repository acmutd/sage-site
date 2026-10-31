import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminSessionProvider } from "@/auth/AdminSession";
import type { AdminAuthAdapter } from "@/auth/adminAuth";
import { createMockAdminAuth } from "@/auth/mockAdminAuth";
import { createMockAdminAccess } from "@/access/adminAccess";
import { useTierStore } from "@/stores/tierStore";
import type { AccessTier } from "./tiers";
import { RequireTier } from "./RequireTier";

const restoredOfficer: AdminAuthAdapter = {
  ...createMockAdminAuth(),
  resumeSession: async () => ({ email: "officer@acmutd.co", displayName: null }),
};

function renderGuarded(auth: AdminAuthAdapter, backendTier: AccessTier, min: Exclude<AccessTier, "none">) {
  return render(
    <MemoryRouter initialEntries={["/guarded"]}>
      <AdminSessionProvider auth={auth} access={createMockAdminAccess(backendTier)}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/" element={<p>admin home</p>} />
          <Route
            path="/guarded"
            element={
              <RequireTier min={min}>
                <p>guarded view</p>
              </RequireTier>
            }
          />
        </Routes>
      </AdminSessionProvider>
    </MemoryRouter>,
  );
}

describe("RequireTier", () => {
  it("renders nothing while the session is being checked", () => {
    const auth = { ...createMockAdminAuth(), resumeSession: () => new Promise<never>(() => {}) };
    const { container } = renderGuarded(auth, "suggest", "suggest");

    expect(container).toBeEmptyDOMElement();
  });

  it("sends a signed-out visitor to login", async () => {
    renderGuarded(createMockAdminAuth(), "suggest", "suggest");

    expect(await screen.findByText("login page")).toBeInTheDocument();
  });

  it.each<AccessTier>(["suggest", "admin"])('lets the %s tier through min="suggest"', async (tier) => {
    renderGuarded(restoredOfficer, tier, "suggest");

    expect(await screen.findByText("guarded view")).toBeInTheDocument();
  });

  it("sends a refused account (none) back to login", async () => {
    renderGuarded(restoredOfficer, "none", "suggest");

    expect(await screen.findByText("login page")).toBeInTheDocument();
    expect(screen.queryByText("guarded view")).not.toBeInTheDocument();
  });

  it('sends the suggest tier from a min="admin" route to the admin home', async () => {
    renderGuarded(restoredOfficer, "suggest", "admin");

    expect(await screen.findByText("admin home")).toBeInTheDocument();
    expect(screen.queryByText("guarded view")).not.toBeInTheDocument();
  });

  it('lets admin through min="admin"', async () => {
    renderGuarded(restoredOfficer, "admin", "admin");

    expect(await screen.findByText("guarded view")).toBeInTheDocument();
  });

  it("sends a signed-in session that lost its tier to login", async () => {
    renderGuarded(restoredOfficer, "suggest", "suggest");
    await screen.findByText("guarded view");

    act(() => useTierStore.getState().clearTier());

    expect(await screen.findByText("login page")).toBeInTheDocument();
  });
});
