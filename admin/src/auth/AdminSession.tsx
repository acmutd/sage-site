import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { resolveTier } from "@/access/tiers";
import type { OfficerDirectory } from "@/officers/officerDirectory";
import { useTierStore } from "@/stores/tierStore";
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

interface AdminSessionProviderProps {
  auth: AdminAuthAdapter;
  directory: OfficerDirectory;
  children: ReactNode;
}

export function AdminSessionProvider({ auth, directory, children }: AdminSessionProviderProps) {
  const [state, setState] = useState<SessionState>({ status: "checking", user: null });
  const setTier = useTierStore((store) => store.setTier);
  const clearTier = useTierStore((store) => store.clearTier);

  // Runs after every sign-in and restored session. Anything short of a tier signs out (default deny).
  const admit = useCallback(
    async (user: AdminUser) => {
      const record = await directory.getMyRecord(user.email).catch(async (error: unknown) => {
        await auth.signOut();
        throw error;
      });
      const tier = resolveTier(record);
      if (tier === "none") {
        await auth.signOut();
        // Same toast as a personal account, so the UI never reveals who is an officer
        throw new AdminAccessError();
      }
      // Set before signedIn, so RequireTier never sees a session without a tier
      setTier(tier);
      setState({ status: "signedIn", user });
    },
    [auth, directory, setTier],
  );

  useEffect(() => {
    let active = true;
    auth
      .resumeSession()
      .then(async (user) => {
        if (!active) return;
        if (user) await admit(user);
        else setState(SIGNED_OUT);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState(SIGNED_OUT);
        notifySignInError(error);
      });
    return () => {
      active = false;
    };
  }, [auth, admit]);

  const signIn = useCallback(async () => {
    try {
      await admit(await auth.signInWithGoogle());
    } catch (error) {
      notifySignInError(error);
    }
  }, [auth, admit]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    clearTier();
    setState(SIGNED_OUT);
  }, [auth, clearTier]);

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSession {
  const session = useContext(AdminSessionContext);
  if (!session) throw new Error("useAdminSession must be used inside AdminSessionProvider");
  return session;
}
