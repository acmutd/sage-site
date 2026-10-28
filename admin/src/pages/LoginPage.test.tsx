import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import LoginPage from "./LoginPage";
import AdminHomePage from "./AdminHomePage";
import { createMockAdminAuth } from "@/auth/mockAdminAuth";
import { AdminSessionProvider, RequireAdminSession } from "@/auth/AdminSession";
import {
  ADMIN_ACCESS_DENIED_MESSAGE,
  AdminAccessError,
  SIGN_IN_FAILED_MESSAGE,
  type AdminAuthAdapter,
} from "@/auth/adminAuth";

function renderAdmin(auth: AdminAuthAdapter) {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Toaster />
      <AdminSessionProvider auth={auth}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAdminSession>
                <AdminHomePage />
              </RequireAdminSession>
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
