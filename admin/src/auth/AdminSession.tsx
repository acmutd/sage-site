import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ADMIN_ACCESS_DENIED_MESSAGE,
  AdminAccessError,
  SIGN_IN_FAILED_MESSAGE,
  SignInCancelledError,
  type AdminAuthAdapter,
  type AdminUser,
} from "./adminAuth";

type SessionState =
  | { status: "checking"; user: null }
  | { status: "signedOut"; user: null }
  | { status: "signedIn"; user: AdminUser };

interface AdminSession {
  status: SessionState["status"];
  user: AdminUser | null;
  // Never rejects: failures surface as the shared toast
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

const SIGNED_OUT: SessionState = { status: "signedOut", user: null };

const AdminSessionContext = createContext<AdminSession | null>(null);

function notifySignInError(error: unknown) {
  if (error instanceof SignInCancelledError) return;
  if (error instanceof AdminAccessError) {
    toast.error(ADMIN_ACCESS_DENIED_MESSAGE);
    return;
  }
  console.error("Admin sign-in failed:", error);
  toast.error(SIGN_IN_FAILED_MESSAGE);
}

export function AdminSessionProvider({ auth, children }: { auth: AdminAuthAdapter; children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "checking", user: null });

  useEffect(() => {
    let active = true;
    auth.resumeSession().then(
      (user) => active && setState(user ? { status: "signedIn", user } : SIGNED_OUT),
      (error: unknown) => {
        if (!active) return;
        setState(SIGNED_OUT);
        notifySignInError(error);
      },
    );
    return () => {
      active = false;
    };
  }, [auth]);

  const signIn = useCallback(async () => {
    try {
      const user = await auth.signInWithGoogle();
      setState({ status: "signedIn", user });
    } catch (error) {
      notifySignInError(error);
    }
  }, [auth]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setState(SIGNED_OUT);
  }, [auth]);

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSession {
  const session = useContext(AdminSessionContext);
  if (!session) throw new Error("useAdminSession must be used inside AdminSessionProvider");
  return session;
}

// Phase 3 replaces this with RequireTier
export function RequireAdminSession({ children }: { children: ReactNode }) {
  const { status } = useAdminSession();
  if (status === "checking") return null;
  if (status === "signedOut") return <Navigate to="/login" replace />;
  return children;
}
