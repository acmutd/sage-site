export const ADMIN_HOSTED_DOMAIN = "acmutd.co";

// A fresh sign-in carries Google's hd claim. A session restored after reload doesn't,
// so only its email is left to check.
export type AdminAccountEvidence =
  | { kind: "signIn"; hd: unknown }
  | { kind: "restored"; email: string | null };

// UX gate only: the backend re-checks the domain once admin APIs exist.
export function isAllowedAdminAccount(evidence: AdminAccountEvidence): boolean {
  if (evidence.kind === "signIn") return evidence.hd === ADMIN_HOSTED_DOMAIN;
  return evidence.email?.toLowerCase().endsWith(`@${ADMIN_HOSTED_DOMAIN}`) ?? false;
}
