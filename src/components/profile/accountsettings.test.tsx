import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import AccountSettings from "./accountsettings";
import { useAccountSettingsStore } from "@/stores/accountsettingStore";
import {
    reauthenticateWithCredential,
    reauthenticateWithPopup,
    sendPasswordResetEmail,
} from "firebase/auth";

const mockReplace = vi.fn();
const mockLogout = vi.fn();
let mockUser: any;
const originalLocation = window.location;

vi.mock("@/firebase-config", () => ({ auth: {} }));

vi.mock("@/context/AuthContext", () => ({
    useAuth: () => ({ user: mockUser, logout: mockLogout }),
}));

vi.mock("firebase/auth", () => ({
    EmailAuthProvider: { credential: vi.fn((email: string, password: string) => ({ email, password })) },
    GoogleAuthProvider: class { },
    reauthenticateWithCredential: vi.fn(),
    reauthenticateWithPopup: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
}));

function makeUser(providerIds: string[]) {
    return {
        uid: "test-user-123",
        email: "jane@utdallas.edu",
        providerData: providerIds.map((providerId) => ({ providerId })),
        getIdToken: vi.fn().mockResolvedValue("fresh-token"),
    };
}

// The dialog is opened from elsewhere (e.g. the navbar avatar menu) via the store.
function openDialog() {
    act(() => useAccountSettingsStore.getState().setOpen(true));
}

function startDelete() {
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: /delete account/i }));
}

function fillConfirm({ password }: { password?: string } = {}) {
    if (password !== undefined) {
        fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: password } });
    }
    fireEvent.change(screen.getByLabelText(/type delete to confirm/i), { target: { value: "DELETE" } });
}

beforeEach(() => {
    vi.clearAllMocks();
    useAccountSettingsStore.setState({ open: false });
    Object.defineProperty(window, "location", {
        configurable: true,
        value: { origin: originalLocation.origin, href: originalLocation.href, replace: mockReplace },
    });
    vi.stubEnv("VITE_CRUD_API", "http://localhost:3000/CRUD");
    mockUser = makeUser(["password"]);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }) as any;
});

afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
});

describe("visibility", () => {
    test("renders nothing until opened via the store", () => {
        render(<AccountSettings />);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        openDialog();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    test("renders nothing when signed out, even if opened", () => {
        mockUser = null;
        render(<AccountSettings />);
        openDialog();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    test("closing the dialog updates the store", async () => {
        render(<AccountSettings />);
        openDialog();
        fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
        await waitFor(() => expect(useAccountSettingsStore.getState().open).toBe(false));
    });
});

describe("provider gating", () => {
    test("email/password users see both password and delete actions", () => {
        render(<AccountSettings />);
        openDialog();
        expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /delete account/i })).toBeInTheDocument();
    });

    test("Google-only users do not see the password reset option, but see why", () => {
        mockUser = makeUser(["google.com"]);
        render(<AccountSettings />);
        openDialog();
        expect(screen.queryByRole("button", { name: /send reset link/i })).not.toBeInTheDocument();
        expect(screen.getByText(/you sign in with google/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /delete account/i })).toBeInTheDocument();
    });

    test("renders when the user object has no providerData", () => {
        mockUser = { uid: "u", getIdToken: vi.fn() };
        render(<AccountSettings />);
        openDialog();
        expect(screen.getByRole("button", { name: /delete account/i })).toBeInTheDocument();
        expect(screen.queryByText(/you sign in with google/i)).not.toBeInTheDocument();
    });
});

describe("change password", () => {
    test("sends the reset email to the signed-in user and disables the button", async () => {
        vi.mocked(sendPasswordResetEmail).mockResolvedValueOnce(undefined);
        render(<AccountSettings />);
        openDialog();
        fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

        expect(await screen.findByRole("status")).toHaveTextContent("jane@utdallas.edu");
        expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), "jane@utdallas.edu", {
            url: `${window.location.origin}/profile`,
        });
        expect(screen.getByRole("button", { name: /check your email/i })).toBeDisabled();
    });

    test("shows a rate-limit message and keeps the button enabled", async () => {
        vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce({ code: "auth/too-many-requests" });
        render(<AccountSettings />);
        openDialog();
        fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(/too many attempts/i);
        expect(screen.getByRole("button", { name: /send reset link/i })).toBeEnabled();
    });

    test("shows a generic message for other errors", async () => {
        vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce({ code: "auth/network-request-failed" });
        render(<AccountSettings />);
        openDialog();
        fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't send the reset email/i);
    });
});

describe("delete account", () => {
    test("submit is disabled until the password and DELETE are entered", () => {
        render(<AccountSettings />);
        startDelete();
        const submit = screen.getByRole("button", { name: /permanently delete/i });
        expect(submit).toBeDisabled();

        fireEvent.change(screen.getByLabelText(/type delete to confirm/i), { target: { value: "DELETE" } });
        expect(submit).toBeDisabled();

        fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: "hunter22" } });
        expect(submit).toBeEnabled();
    });

    test("email user: re-authenticates, calls DELETE with a fresh token, signs out, then does a full reload", async () => {
        vi.mocked(reauthenticateWithCredential).mockResolvedValueOnce({} as any);
        render(<AccountSettings />);
        startDelete();
        fillConfirm({ password: "hunter22" });
        fireEvent.click(screen.getByRole("button", { name: /permanently delete/i }));

        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
        expect(mockLogout).toHaveBeenCalled();
        expect(mockLogout.mock.invocationCallOrder[0]).toBeLessThan(mockReplace.mock.invocationCallOrder[0]);

        expect(reauthenticateWithCredential).toHaveBeenCalledWith(
            mockUser,
            expect.objectContaining({ email: "jane@utdallas.edu", password: "hunter22" })
        );
        expect(mockUser.getIdToken).toHaveBeenCalledWith(true);
        expect(global.fetch).toHaveBeenCalledWith("http://localhost:3000/CRUD/users", {
            method: "DELETE",
            headers: { Authorization: "Bearer fresh-token" },
        });
    });

    test("Google user: re-authenticates with a popup", async () => {
        mockUser = makeUser(["google.com"]);
        vi.mocked(reauthenticateWithPopup).mockResolvedValueOnce({} as any);
        render(<AccountSettings />);
        startDelete();
        fillConfirm();
        fireEvent.click(screen.getByRole("button", { name: /permanently delete/i }));

        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
        expect(mockLogout).toHaveBeenCalled();
        expect(reauthenticateWithPopup).toHaveBeenCalled();
        expect(reauthenticateWithCredential).not.toHaveBeenCalled();
    });

    test("wrong password: no request is sent and the user stays signed in", async () => {
        vi.mocked(reauthenticateWithCredential).mockRejectedValueOnce({ code: "auth/invalid-credential" });
        render(<AccountSettings />);
        startDelete();
        fillConfirm({ password: "wrong" });
        fireEvent.click(screen.getByRole("button", { name: /permanently delete/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(/password is incorrect/i);
        expect(global.fetch).not.toHaveBeenCalled();
        expect(mockLogout).not.toHaveBeenCalled();
    });

    test("partial backend failure (500): shows a retry message, logs failed steps, stays signed in", async () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        vi.mocked(reauthenticateWithCredential).mockResolvedValueOnce({} as any);
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({ error: "Account deletion incomplete", deleted: ["students"], failed: ["s3"] }),
        }) as any;
        render(<AccountSettings />);
        startDelete();
        fillConfirm({ password: "hunter22" });
        fireEvent.click(screen.getByRole("button", { name: /permanently delete/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(/still active/i);
        expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/incomplete/i), ["s3"]);
        expect(mockLogout).not.toHaveBeenCalled();
        expect(mockReplace).not.toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    test.each([401, 403])("token rejected (%i): says nothing was deleted and stays signed in", async (status) => {
        vi.mocked(reauthenticateWithCredential).mockResolvedValueOnce({} as any);
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status,
            json: async () => ({ error: "Unauthorized: Invalid Firebase Token" }),
        }) as any;
        render(<AccountSettings />);
        startDelete();
        fillConfirm({ password: "hunter22" });
        fireEvent.click(screen.getByRole("button", { name: /permanently delete/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(/nothing was deleted/i);
        expect(mockLogout).not.toHaveBeenCalled();
    });

    test("error response with an unreadable body still shows the retry message", async () => {
        vi.mocked(reauthenticateWithCredential).mockResolvedValueOnce({} as any);
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 502,
            json: async () => {
                throw new Error("not json");
            },
        }) as any;
        render(<AccountSettings />);
        startDelete();
        fillConfirm({ password: "hunter22" });
        fireEvent.click(screen.getByRole("button", { name: /permanently delete/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(/still active/i);
    });

    test("network failure: shows a message and does not sign the user out", async () => {
        vi.mocked(reauthenticateWithCredential).mockResolvedValueOnce({} as any);
        global.fetch = vi.fn().mockRejectedValue(new Error("offline")) as any;
        render(<AccountSettings />);
        startDelete();
        fillConfirm({ password: "hunter22" });
        fireEvent.click(screen.getByRole("button", { name: /permanently delete/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't reach the server/i);
        expect(mockLogout).not.toHaveBeenCalled();
    });
});