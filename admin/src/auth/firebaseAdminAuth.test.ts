import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type AdditionalUserInfo,
  type Auth,
  type User,
  type UserCredential,
} from "firebase/auth";
import { AdminAccessError, SignInCancelledError } from "./adminAuth";
import { createAdminGoogleProvider, createFirebaseAdminAuth } from "./firebaseAdminAuth";

// Keep the real GoogleAuthProvider so custom parameters are checked for real
vi.mock("firebase/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase/auth")>()),
  getAdditionalUserInfo: vi.fn(),
  getRedirectResult: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
}));

function fakeUser(email: string | null, googleEmail: string | null = email): User {
  return {
    email,
    displayName: "Test User",
    providerData: [{ providerId: "google.com", email: googleEmail }],
  } as User;
}

function credential(email: string, hd?: string): UserCredential {
  const result = { user: fakeUser(email) } as UserCredential;
  vi.mocked(getAdditionalUserInfo).mockReturnValue({
    isNewUser: false,
    providerId: "google.com",
    profile: hd === undefined ? { email } : { email, hd },
  } as AdditionalUserInfo);
  return result;
}

function fakeAuth(currentUser: User | null = null): Auth {
  return { currentUser, authStateReady: vi.fn().mockResolvedValue(undefined) } as unknown as Auth;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRedirectResult).mockResolvedValue(null);
});

describe("createAdminGoogleProvider", () => {
  it("pre-filters the chooser to acmutd.co and always shows it", () => {
    expect(createAdminGoogleProvider().getCustomParameters()).toEqual({
      hd: "acmutd.co",
      prompt: "select_account",
    });
  });

  it("requests the email scope, which Google needs to return email and hd", () => {
    expect(createAdminGoogleProvider().getScopes()).toEqual(expect.arrayContaining(["email", "profile"]));
  });
});

describe("signInWithGoogle", () => {
  it("admits an acmutd.co account", async () => {
    vi.mocked(signInWithPopup).mockResolvedValue(credential("officer@acmutd.co", "acmutd.co"));

    const user = await createFirebaseAdminAuth(fakeAuth()).signInWithGoogle();

    expect(user).toEqual({ email: "officer@acmutd.co", displayName: "Test User" });
    expect(vi.mocked(signInWithPopup).mock.calls[0][1]).toBeInstanceOf(GoogleAuthProvider);
    expect(signOut).not.toHaveBeenCalled();
  });

  it.each([
    ["a personal Gmail account (no hd)", "someone@gmail.com", undefined],
    ["another Workspace domain", "someone@utdallas.edu", "utdallas.edu"],
  ])("signs out %s and rejects with AdminAccessError", async (_, email, hd) => {
    const auth = fakeAuth();
    vi.mocked(signInWithPopup).mockResolvedValue(credential(email, hd));

    await expect(createFirebaseAdminAuth(auth).signInWithGoogle()).rejects.toBeInstanceOf(AdminAccessError);
    expect(signOut).toHaveBeenCalledWith(auth);
  });

  it("falls back to redirect sign-in when the popup is blocked", async () => {
    const auth = fakeAuth();
    vi.mocked(signInWithPopup).mockRejectedValue({ code: "auth/popup-blocked" });
    vi.mocked(signInWithRedirect).mockResolvedValue(undefined as never);

    await createFirebaseAdminAuth(auth).signInWithGoogle();

    const provider = vi.mocked(signInWithRedirect).mock.calls[0][1] as GoogleAuthProvider;
    expect(signInWithRedirect).toHaveBeenCalledWith(auth, provider);
    expect(provider.getCustomParameters()).toEqual({ hd: "acmutd.co", prompt: "select_account" });
  });

  it.each(["auth/popup-closed-by-user", "auth/cancelled-popup-request"])(
    "treats %s as a cancel, not a rejection",
    async (code) => {
      vi.mocked(signInWithPopup).mockRejectedValue({ code });

      await expect(createFirebaseAdminAuth(fakeAuth()).signInWithGoogle()).rejects.toBeInstanceOf(
        SignInCancelledError,
      );
      expect(signOut).not.toHaveBeenCalled();
    },
  );

  it("passes other errors through", async () => {
    const networkError = { code: "auth/network-request-failed" };
    vi.mocked(signInWithPopup).mockRejectedValue(networkError);

    await expect(createFirebaseAdminAuth(fakeAuth()).signInWithGoogle()).rejects.toBe(networkError);
  });
});

describe("resumeSession", () => {
  it("returns null when nobody is signed in", async () => {
    await expect(createFirebaseAdminAuth(fakeAuth()).resumeSession()).resolves.toBeNull();
  });

  it("admits a redirect result with the acmutd.co hd", async () => {
    vi.mocked(getRedirectResult).mockResolvedValue(credential("officer@acmutd.co", "acmutd.co"));

    await expect(createFirebaseAdminAuth(fakeAuth()).resumeSession()).resolves.toMatchObject({
      email: "officer@acmutd.co",
    });
  });

  it("signs out a redirect result without the acmutd.co hd", async () => {
    const auth = fakeAuth();
    vi.mocked(getRedirectResult).mockResolvedValue(credential("someone@gmail.com"));

    await expect(createFirebaseAdminAuth(auth).resumeSession()).rejects.toBeInstanceOf(AdminAccessError);
    expect(signOut).toHaveBeenCalledWith(auth);
  });

  it("keeps a restored @acmutd.co session", async () => {
    const auth = fakeAuth(fakeUser("officer@acmutd.co"));

    await expect(createFirebaseAdminAuth(auth).resumeSession()).resolves.toMatchObject({
      email: "officer@acmutd.co",
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("falls back to the Google provider email when the account's top-level email is null", async () => {
    const auth = fakeAuth(fakeUser(null, "officer@acmutd.co"));

    await expect(createFirebaseAdminAuth(auth).resumeSession()).resolves.toMatchObject({
      email: "officer@acmutd.co",
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signs out a restored session with no email anywhere", async () => {
    const auth = fakeAuth(fakeUser(null, null));

    await expect(createFirebaseAdminAuth(auth).resumeSession()).resolves.toBeNull();
    expect(signOut).toHaveBeenCalledWith(auth);
  });

  it("signs out a restored session outside @acmutd.co", async () => {
    const auth = fakeAuth(fakeUser("someone@gmail.com"));

    await expect(createFirebaseAdminAuth(auth).resumeSession()).resolves.toBeNull();
    expect(signOut).toHaveBeenCalledWith(auth);
  });

  it("checks the redirect result only once per page load", async () => {
    const adminAuth = createFirebaseAdminAuth(fakeAuth());

    await Promise.all([adminAuth.resumeSession(), adminAuth.resumeSession()]);

    expect(getRedirectResult).toHaveBeenCalledTimes(1);
  });
});
