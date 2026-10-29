import type { AdminAction } from "@/access/can";

export interface Suggestion {
  action: AdminAction;
}

// Stub: the suggestion/approval workflow is out of scope for this PR.
export async function submitSuggestion(suggestion: Suggestion): Promise<void> {
  console.info("[suggestions] submitSuggestion stub:", suggestion);
}
