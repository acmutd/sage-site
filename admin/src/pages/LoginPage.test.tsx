import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import LoginPage from "./LoginPage";
import { createMockAdminAuth } from "@/auth/mockAdminAuth";
import { ADMIN_ACCESS_DENIED_MESSAGE } from "@/auth";

function renderLogin(mode: "allow" | "reject") {
  return render(
    <MemoryRouter>
      <Toaster />
      <LoginPage auth={createMockAdminAuth(mode, 0)} />
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  it("offers Google as the only sign-in action, with the domain disclaimer", () => {
    renderLogin("allow");

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText(/@acmutd\.co/)).toBeInTheDocument();
  });

  it("shows the generic toast when the account is rejected", async () => {
    renderLogin("reject");

    fireEvent.click(screen.getByRole("button", { name: /sign in with google/i }));

    expect(await screen.findByText(ADMIN_ACCESS_DENIED_MESSAGE)).toBeInTheDocument();
  });
});
