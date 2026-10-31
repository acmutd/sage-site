import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
  type UserCredential,
} from "firebase/auth";
import { AdminAccessError, SignInCancelledError, type AdminAuthAdapter, type AdminUser } from "./adminAuth";
import { ADMIN_HOSTED_DOMAIN, isAllowedAdminAccount } from "./isAllowedAdminAccount";

const CANCELLED_CODES: unknown[] = ["auth/popup-closed-by-user", "auth/cancelled-popup-request"];

function errorCode(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
}

// Firebase keeps the top-level email from account creation, so an account first created
// without it stays null; the Google provider entry is refreshed on every sign-in.
// Same fallback as SAGE main's login form.
function resolveEmail(user: User): string | null {
  return user.email ?? user.providerData.find((p) => p.providerId === "google.com")?.email ?? null;
}

function toAdminUser(user: User): AdminUser {
  return { email: resolveEmail(user) ?? "", displayName: user.displayName };
}

export function createAdminGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  // Firebase only adds "profile"; without "email", Google omits both email and the hd claim
  provider.addScope("email");
  // hd only pre-filters Google's account chooser; the claim is verified after sign-in
  provider.setCustomParameters({ hd: ADMIN_HOSTED_DOMAIN, prompt: "select_account" });
  return provider;
}

export function createFirebaseAdminAuth(auth: Auth): AdminAuthAdapter {
  let resumed: Promise<AdminUser | null> | undefined;

  async function admitSignIn(result: UserCredential): Promise<AdminUser> {
    const hd = getAdditionalUserInfo(result)?.profile?.hd;
    if (!isAllowedAdminAccount({ kind: "signIn", hd })) {
      await signOut(auth);
      throw new AdminAccessError();
    }
    return toAdminUser(result.user);
  }

  async function resume(): Promise<AdminUser | null> {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult) return admitSignIn(redirectResult);

    // A restored session has no hd claim, so fall back to the email domain
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) return null;
    if (!isAllowedAdminAccount({ kind: "restored", email: resolveEmail(user) })) {
      await signOut(auth);
      return null;
    }
    return toAdminUser(user);
  }

  return {
    async signInWithGoogle() {
      // No await before the popup opens, or Safari treats it as unprompted and blocks it
      const provider = createAdminGoogleProvider();
      let result: UserCredential;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (error) {
        const code = errorCode(error);
        // Navigates away; getRedirectResult in resumeSession picks it up on return
        if (code === "auth/popup-blocked") return signInWithRedirect(auth, provider);
        if (CANCELLED_CODES.includes(code)) throw new SignInCancelledError();
        throw error;
      }
      return admitSignIn(result);
    },

    // Memoized so StrictMode's double effect doesn't process a redirect result twice
    resumeSession() {
      resumed ??= resume();
      return resumed;
    },

    async signOut() {
      await signOut(auth);
    },

    async getIdToken() {
      if (!auth.currentUser) throw new Error("Not signed in");
      return auth.currentUser.getIdToken();
    },
  };
}
