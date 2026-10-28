import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import LoginPage from "./LoginPage";
import AdminHomePage from "./AdminHomePage";
import { createMockAdminAuth } from "@/auth/mockAdminAuth";
import { AdminSessionProvider } from "@/auth/AdminSession";
import { RequireTier } from "@/access/RequireTier";
import { createFixtureOfficerDirectory, type DevOfficerCase } from "@/officers/fixtureOfficerDirectory";
import type { OfficerDirectory } from "@/officers/officerDirectory";
import { useTierStore } from "@/stores/tierStore";
import {
  ADMIN_ACCESS_DENIED_MESSAGE,
  AdminAccessError,
  SIGN_IN_FAILED_MESSAGE,
  type AdminAuthAdapter,
} from "@/auth/adminAuth";

function renderAdmin(
  auth: AdminAuthAdapter,
  directory: OfficerDirectory = createFixtureOfficerDirectory("sage-officer"),
) {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Toaster />
      <AdminSessionProvider auth={auth} directory={directory}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireTier min="suggest">
                <AdminHomePage />
              </RequireTier>
            }
          />
        </Routes>
      </AdminSessionProvider>
    </MemoryRouter>,
  );
}

function googleButton() {
  return screen.findByRole("button", { name: /sign in with google/i });
}

describe("LoginPage", () => {
  it("offers Google as the only sign-in action, with the domain disclaimer", async () => {
    renderAdmin(createMockAdminAuth("allow", 0));

    expect(await googleButton()).toBeEnabled();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText(/@acmutd\.co/)).toBeInTheDocument();
  });

  it("shows the generic toast when the account is rejected", async () => {
    renderAdmin(createMockAdminAuth("reject", 0));

    fireEvent.click(await googleButton());

    expect(await screen.findByText(ADMIN_ACCESS_DENIED_MESSAGE)).toBeInTheDocument();
    expect(await googleButton()).toBeEnabled();
  });

  it("disables the button while pending, and resets it without a toast on cancel", async () => {
    renderAdmin(createMockAdminAuth("cancel", 50));

    fireEvent.click(await googleButton());

    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    expect(await googleButton()).toBeEnabled();
    expect(screen.queryByText(ADMIN_ACCESS_DENIED_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText(SIGN_IN_FAILED_MESSAGE)).not.toBeInTheDocument();
  });

  it("shows a retry toast, not the access message, for other failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = { ...createMockAdminAuth(), signInWithGoogle: () => Promise.reject(new Error("offline")) };
    renderAdmin(auth);

    fireEvent.click(await googleButton());

    expect(await screen.findByText(SIGN_IN_FAILED_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(ADMIN_ACCESS_DENIED_MESSAGE)).not.toBeInTheDocument();
  });

  it("routes to the admin placeholder on success, and back to login on sign out", async () => {
    renderAdmin(createMockAdminAuth("allow", 0));

    fireEvent.click(await googleButton());

    expect(await screen.findByText(/signed in as officer@acmutd\.co/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(await googleButton()).toBeEnabled();
  });

  it("skips the login page for a restored admin session", async () => {
    const auth = {
      ...createMockAdminAuth(),
      resumeSession: async () => ({ email: "officer@acmutd.co", displayName: null }),
    };
    renderAdmin(auth);

    expect(await screen.findByText(/signed in as officer@acmutd\.co/i)).toBeInTheDocument();
  });

  it("shows the generic toast when a redirect sign-in is rejected on return", async () => {
    const auth = { ...createMockAdminAuth(), resumeSession: () => Promise.reject(new AdminAccessError()) };
    renderAdmin(auth);

    expect(await screen.findByText(ADMIN_ACCESS_DENIED_MESSAGE)).toBeInTheDocument();
    await waitFor(async () => expect(await googleButton()).toBeEnabled());
  });
});

describe("officer tiers", () => {
  function signInAs(officerCase: DevOfficerCase) {
    const auth = createMockAdminAuth("allow", 0);
    const signOut = vi.spyOn(auth, "signOut");
    renderAdmin(auth, createFixtureOfficerDirectory(officerCase));
    return { signOut };
  }

  it.each<DevOfficerCase>(["non-sage-officer", "no-record"])(
    "signs out %s with the same generic toast as a personal account",
    async (officerCase) => {
      const { signOut } = signInAs(officerCase);

      fireEvent.click(await googleButton());

      expect(await screen.findByText(ADMIN_ACCESS_DENIED_MESSAGE)).toBeInTheDocument();
      expect(signOut).toHaveBeenCalled();
      expect(await googleButton()).toBeEnabled();
      expect(useTierStore.getState().tier).toBeNull();
    },
  );

  it("shows the suggest tier every action as a suggestion", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    signInAs("sage-officer");

    fireEvent.click(await googleButton());

    const suggestButtons = await screen.findAllByRole("button", { name: "Suggest change" });
    expect(suggestButtons).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /^(create|update|delete)$/i })).not.toBeInTheDocument();

    fireEvent.click(suggestButtons[2]);
    expect(info).toHaveBeenCalledWith(expect.stringContaining("submitSuggestion"), { action: "delete" });
  });

  it.each<DevOfficerCase>(["sage-lead", "director-of-development", "exec"])(
    "gives %s the direct actions",
    async (officerCase) => {
      signInAs(officerCase);

      fireEvent.click(await googleButton());

      for (const name of ["Create", "Update", "Delete"]) {
        expect(await screen.findByRole("button", { name })).toBeInTheDocument();
      }
      expect(screen.queryByRole("button", { name: "Suggest change" })).not.toBeInTheDocument();
    },
  );

  it("clears the tier on sign out", async () => {
    signInAs("sage-lead");
    fireEvent.click(await googleButton());

    fireEvent.click(await screen.findByRole("button", { name: /sign out/i }));

    expect(await googleButton()).toBeEnabled();
    expect(useTierStore.getState().tier).toBeNull();
  });

  it("re-checks the tier of a restored session", async () => {
    const auth = {
      ...createMockAdminAuth(),
      resumeSession: async () => ({ email: "officer@acmutd.co", displayName: null }),
    };
    const signOut = vi.spyOn(auth, "signOut");
    renderAdmin(auth, createFixtureOfficerDirectory("non-sage-officer"));

    expect(await screen.findByText(ADMIN_ACCESS_DENIED_MESSAGE)).toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
    expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument();
  });

  it("signs out with the retry toast when the officer lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = createMockAdminAuth("allow", 0);
    const signOut = vi.spyOn(auth, "signOut");
    renderAdmin(auth, { getMyRecord: () => Promise.reject(new Error("offline")) });

    fireEvent.click(await googleButton());

    expect(await screen.findByText(SIGN_IN_FAILED_MESSAGE)).toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
    expect(screen.queryByText(ADMIN_ACCESS_DENIED_MESSAGE)).not.toBeInTheDocument();
  });
});
