import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    EmailAuthProvider,
    GoogleAuthProvider,
    reauthenticateWithCredential,
    reauthenticateWithPopup,
    sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/firebase-config";
import { useAuth } from "@/context/AuthContext";
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
 * Account settings for Profile page:
 *  - Change password: sends Firebase's reset email (email/password accounts only)
 *  - Delete account: re-authenticates, then calls DELETE {VITE_CRUD_API}/users
 *
 * Feedback is shown inline in the dialog as opposed to using a toast.
 */
export default function AccountSettings() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);

    const providerIds = user?.providerData?.map((p) => p.providerId) ?? [];
    const hasPassword = providerIds.includes("password");
    const hasGoogle = providerIds.includes("google.com");

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

    /* Delete Account */
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
            setDeleteError(
                res.status === 401
                    ? "We couldn't verify your sign-in. Please try again."
                    : "We couldn't finish deleting your data. Your account is still active, so you can try again."
            );
            setDeleting(false);
            return;
        }

        setOpen(false);
        navigate("/", { replace: true });
        await logout();
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="px-4 py-1.5 rounded-full text-sm border-2 border-card-bord bg-white text-textdark hover:border-accent transition-all duration-200 whitespace-nowrap"
            >
                Account settings
            </button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="bg-white rounded-2xl max-w-md w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Account settings</DialogTitle>
                        <DialogDescription data-clarity-mask="True">
                            {user?.email ? `Signed in as ${user.email}` : "Manage your SAGE account"}
                        </DialogDescription>
                    </DialogHeader>

                    {hasPassword && (
                        <section aria-labelledby="password-heading" className="space-y-3">
                            <h3 id="password-heading" className="text-base font-semibold">
                                Password
                            </h3>
                            <p className="text-sm text-textsecondary">
                                We'll email you a link to choose a new password.
                            </p>
                            <Button
                                type="button"
                                onClick={handleSendReset}
                                disabled={resetSending || resetCooling}
                                className="rounded-full bg-accent hover:bg-buttonhover text-textdark"
                            >
                                {resetSending
                                    ? "Sending..."
                                    : resetCooling
                                        ? "Check your email"
                                        : "Send password reset link"}
                            </Button>
                            {resetNotice && (
                                <p
                                    role={resetNotice.kind === "error" ? "alert" : "status"}
                                    data-clarity-mask="True"
                                    className={`text-sm ${resetNotice.kind === "error" ? "text-destructive" : "text-textdark"}`}
                                >
                                    {resetNotice.text}
                                </p>
                            )}
                        </section>
                    )}

                    <section
                        aria-labelledby="delete-heading"
                        className="space-y-3 rounded-xl border border-red-200 p-4"
                    >
                        <h3 id="delete-heading" className="text-base font-semibold text-red-700">
                            Delete account
                        </h3>
                        <p className="text-sm text-textsecondary">
                            Permanently deletes your account, profile, transcript, planner and chat history.
                            This can't be undone.
                        </p>

                        {!confirming ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setConfirming(true)}
                                className="rounded-full border-red-300 text-red-700 hover:bg-red-50 hover:text-red-700"
                            >
                                Delete account…
                            </Button>
                        ) : (
                            <form
                                className="space-y-3"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (canDelete) void handleDelete();
                                }}
                            >
                                {hasPassword ? (
                                    <div className="space-y-1">
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
                                            className="h-[2.5rem] px-4 rounded-full border border-border text-[15px]"
                                        />
                                    </div>
                                ) : (
                                    <p className="text-sm text-textsecondary">
                                        You'll be asked to sign in with Google again to confirm.
                                    </p>
                                )}

                                <div className="space-y-1">
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
                                        className="h-[2.5rem] px-4 rounded-full border border-border text-[15px]"
                                    />
                                </div>

                                {deleteError && (
                                    <p role="alert" className="text-sm text-destructive">
                                        {deleteError}
                                    </p>
                                )}

                                <div className="flex gap-2 justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={resetDeleteForm}
                                        disabled={deleting}
                                        className="rounded-full"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={!canDelete}
                                        className="rounded-full bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        {deleting ? "Deleting..." : "Permanently delete"}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </section>
                </DialogContent>
            </Dialog>
        </>
    );
}