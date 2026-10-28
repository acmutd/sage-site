// One message for every rejection, so the UI never reveals who is or isn't an officer.
export const ADMIN_ACCESS_DENIED_MESSAGE = "This account isn't allowed to access SAGE Admin.";

export class AdminAccessError extends Error {
  constructor() {
    super(ADMIN_ACCESS_DENIED_MESSAGE);
    this.name = "AdminAccessError";
  }
}

export interface AdminUser {
  email: string;
  displayName: string | null;
}

export interface AdminAuthAdapter {
  // Resolves with the signed-in user, or rejects with AdminAccessError.
  signInWithGoogle(): Promise<AdminUser>;
}
