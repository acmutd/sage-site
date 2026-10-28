// Field names follow the plan; the real shape depends on ACM Core's officer data.
export interface OfficerRecord {
  email: string;
  team: string;
  position: string;
}

// The only way admin reads officer data. Async because the real source
// (Firestore or a backend /admin/me) will be.
export interface OfficerDirectory {
  // Resolves null when the email has no officer record.
  getMyRecord(email: string): Promise<OfficerRecord | null>;
}

// Used outside development until the real directory exists, so every account resolves to "none".
export function createEmptyOfficerDirectory(): OfficerDirectory {
  return {
    async getMyRecord() {
      return null;
    },
  };
}
