import { useEffect, useRef, useState } from "react";
import {
    EmailAuthProvider,
    GoogleAuthProvider,
    reauthenticateWithCredential,
    reauthenticateWithPopup,
    sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/firebase-config";
import { useAuth } from "@/context/AuthContext";
import { useAccountSettingsStore } from "@/stores/accountsettingStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const CONFIRM_WORD = "DELETE";
const RESET_COOLDOWN_MS = 60_000;

type Notice = { kind: "success" | "error"; text: string };

function errorCode(e: unknown): string | undefined {
    return typeof e === "object" && e !== null && "code" in e
        ? String((e as { code: unknown }).code)
        : undefined;
}

function reauthMessage(e: unknown): string {
    switch (errorCode(e)) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "That password is incorrect.";
        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";
        case "auth/popup-closed-by-user":
        case "auth/cancelled-popup-request":
            return "Google sign-in was cancelled. Your account has not been deleted.";
        case "auth/user-mismatch":
            return "That Google account doesn't match the one you're signed in with.";
        default:
            return "We couldn't verify your identity. Your account has not been deleted.";
    }
}

/**
 * Account settings dialog. Mount it ONCE (in Profile.tsx for now, or in App.tsx if it's
 * ever opened from the navbar) inside the AuthProvider, and open it with
 * `useAccountSettingsStore.getState().setOpen(true)`.
 * It renders nothing when signed out. The dialog contains
 *  - Change password: sends Firebase's reset email (email/password accounts only)
 *  - Delete account: re-authenticates, then calls DELETE {VITE_CRUD_API}/users
 *
 * Feedback is shown inline in the dialog (no toasts), so this component does not
 * depend on a <Toaster /> being mounted on the page.
 */
export default function AccountSettings() {
    const { user, logout } = useAuth();

    const open = useAccountSettingsStore((s) => s.open);
    const setOpen = useAccountSettingsStore((s) => s.setOpen);

    const providerIds = user?.providerData?.map((p) => p.providerId) ?? [];
    const hasPassword = providerIds.includes("password");
    const hasGoogle = providerIds.includes("google.com");

    // change password
    const [resetSending, setResetSending] = useState(false);
    const [resetCooling, setResetCooling] = useState(false);
    const [resetNotice, setResetNotice] = useState<Notice | null>(null);
    const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
        };
    }, []);

    async function handleSendReset() {
        if (!user?.email) return;
        setResetSending(true);
        setResetNotice(null);
        try {
            await sendPasswordResetEmail(auth, user.email, {
                url: `${window.location.origin}/profile`, // land back on Profile after resetting
            });
            setResetNotice({ kind: "success", text: `We sent a reset link to ${user.email}.` });
            setResetCooling(true);
            cooldownTimer.current = setTimeout(() => setResetCooling(false), RESET_COOLDOWN_MS);
        } catch (e) {
            setResetNotice({
                kind: "error",
                text:
                    errorCode(e) === "auth/too-many-requests"
                        ? "Too many attempts. Please try again later."
                        : "Couldn't send the reset email. Please try again.",
            });
        } finally {
            setResetSending(false);
        }
    }

    // delete account
    const [confirming, setConfirming] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [password, setPassword] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const canDelete =
        !deleting &&
        confirmText.trim() === CONFIRM_WORD &&
        (hasPassword ? password.length > 0 : hasGoogle);

    function resetDeleteForm() {
        setConfirming(false);
        setConfirmText("");
        setPassword("");
        setDeleteError(null);
    }

    function handleOpenChange(next: boolean) {
        if (deleting) return; // don't let the dialog close mid-deletion
        setOpen(next);
        if (!next) {
            resetDeleteForm();
            setResetNotice(null);
        }
    }

    async function reauthenticate() {
        if (!user) throw new Error("Not signed in");
        if (hasPassword && user.email) {
            await reauthenticateWithCredential(
                user,
                EmailAuthProvider.credential(user.email, password)
            );
        } else {
            await reauthenticateWithPopup(user, new GoogleAuthProvider());
        }
    }

    async function handleDelete() {
        if (!user) return;
        setDeleting(true);
        setDeleteError(null);

        try {
            await reauthenticate();
        } catch (e) {
            setDeleteError(reauthMessage(e));
            setDeleting(false);
            return;
        }

        let res: Response;
        try {
            const token = await user.getIdToken(true);
            const base = String(import.meta.env.VITE_CRUD_API ?? "").replace(/\/$/, "");
            res = await fetch(`${base}/users`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch {
            setDeleteError("Couldn't reach the server. Your account has not been deleted.");
            setDeleting(false);
            return;
        }

        if (!res.ok) {
            let detail: { failed?: string[] } | null = null;
            try {
                detail = await res.json();
            } catch {
                // body is optional
            }
            if (detail?.failed?.length) {
                console.error("Account deletion incomplete. Failed steps:", detail.failed);
            }
            setDeleteError(
                res.status === 401 || res.status === 403
                    ? "We couldn't verify your sign-in, so nothing was deleted. Please try again."
                    : "We couldn't finish deleting your data. Your account is still active, so you can try again."
            );
            setDeleting(false);
            return;
        }

        setOpen(false);
        await logout();
        window.location.replace("/");
    }

    if (!user) return null;

    const outlineBtn =
        "h-9 shrink-0 rounded-[8px] border-border bg-white px-3 text-sm hover:bg-gray-50 hover:text-textdark";
    const inputCls = "h-10 rounded-[8px] border border-border px-3 text-sm";

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-md gap-0 overflow-y-auto rounded-[10px] bg-white p-0 sm:rounded-[10px] max-h-[90vh]">
                <DialogHeader className="space-y-1 px-6 pb-4 pt-6">
                    <DialogTitle className="text-lg">Account settings</DialogTitle>
                    <DialogDescription
                        data-clarity-mask="True"
                        className={user.email ? "text-sm text-textsecondary" : "sr-only"}
                    >
                        {user.email ?? "Manage your SAGE account"}
                    </DialogDescription>
                </DialogHeader>

                {(hasPassword || hasGoogle) && (
                    <section aria-labelledby="password-heading" className="border-t border-border px-6 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <h3 id="password-heading" className="text-sm font-semibold">
                                Password
                            </h3>
                            {hasPassword && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleSendReset}
                                    disabled={resetSending || resetCooling}
                                    className={outlineBtn}
                                >
                                    {resetSending ? "Sending..." : resetCooling ? "Check your email" : "Send reset link"}
                                </Button>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-textsecondary">
                            {hasPassword
                                ? "We'll email you a link to set a new password."
                                : "You sign in with Google, so your password is managed there."}
                        </p>
                        {resetNotice && (
                            <p
                                role={resetNotice.kind === "error" ? "alert" : "status"}
                                data-clarity-mask="True"
                                className={`mt-2 text-sm ${resetNotice.kind === "error" ? "text-destructive" : "text-textdark"}`}
                            >
                                {resetNotice.text}
                            </p>
                        )}
                    </section>
                )}

                <section aria-labelledby="delete-heading" className="border-t border-border px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <h3 id="delete-heading" className="text-sm font-semibold text-red-700">
                            Delete account
                        </h3>
                        {!confirming && (
                            <Button
                                type="button"
                                variant="outline"
                                aria-label="Delete account"
                                onClick={() => setConfirming(true)}
                                className="h-9 shrink-0 rounded-[8px] border-red-300 bg-white px-3 text-sm text-red-700 hover:bg-red-50 hover:text-red-700"
                            >
                                Delete
                            </Button>
                        )}
                    </div>
                    <p className="mt-1 text-sm text-textsecondary">
                        Permanently deletes your profile, transcript, planner and chat history. This can't be
                        undone.
                    </p>

                    {confirming && (
                        <form
                            className="mt-4 space-y-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (canDelete) void handleDelete();
                            }}
                        >
                            {hasPassword ? (
                                <div className="space-y-1.5">
                                    <label htmlFor="delete-password" className="text-sm">
                                        Current password
                                    </label>
                                    <Input
                                        id="delete-password"
                                        type="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={deleting}
                                        className={inputCls}
                                    />
                                </div>
                            ) : (
                                <p className="text-sm text-textsecondary">
                                    You'll be asked to sign in with Google again to confirm.
                                </p>
                            )}

                            <div className="space-y-1.5">
                                <label htmlFor="delete-confirm" className="text-sm">
                                    Type {CONFIRM_WORD} to confirm
                                </label>
                                <Input
                                    id="delete-confirm"
                                    type="text"
                                    autoComplete="off"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    disabled={deleting}
                                    className={inputCls}
                                />
                            </div>

                            {deleteError && (
                                <p role="alert" className="text-sm text-destructive">
                                    {deleteError}
                                </p>
                            )}

                            <div className="flex justify-end gap-2 pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetDeleteForm}
                                    disabled={deleting}
                                    className={outlineBtn}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!canDelete}
                                    className="h-9 rounded-[8px] bg-red-600 px-4 text-sm text-white hover:bg-red-700"
                                >
                                    {deleting ? "Deleting..." : "Permanently delete"}
                                </Button>
                            </div>
                        </form>
                    )}
                </section>
            </DialogContent>
        </Dialog>
    );
}