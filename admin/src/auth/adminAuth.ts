// One message for every rejection, so the UI never reveals who is or isn't an officer.
export const ADMIN_ACCESS_DENIED_MESSAGE = "This account isn't allowed to access SAGE Admin.";

// Anything that isn't a rejection (network, misconfiguration) must not read as "not allowed".
export const SIGN_IN_FAILED_MESSAGE = "Couldn't sign in. Please try again.";

export class AdminAccessError extends Error {
  constructor() {
    super(ADMIN_ACCESS_DENIED_MESSAGE);
    this.name = "AdminAccessError";
  }
}

// The user closed the Google popup; the UI resets without a toast.
export class SignInCancelledError extends Error {
  constructor() {
    super("Sign-in cancelled");
    this.name = "SignInCancelledError";
  }
}

export interface AdminUser {
  email: string;
  displayName: string | null;
}

export interface AdminAuthAdapter {
  // Resolves with the signed-in user, or rejects with AdminAccessError or SignInCancelledError.
  signInWithGoogle(): Promise<AdminUser>;
  // Runs once on page load: finishes a redirect sign-in, else checks a restored session.
  // Resolves null when nobody is signed in; rejects with AdminAccessError for a rejected redirect.
  resumeSession(): Promise<AdminUser | null>;
  signOut(): Promise<void>;
}
