/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base URL of the admin API including the stage, e.g. https://<id>.execute-api.us-east-2.amazonaws.com/prod
  readonly VITE_ADMIN_API?: string;
  // Preview without Firebase: allow | reject | cancel
  readonly VITE_ADMIN_AUTH_MOCK?: string;
  // With the mock above: none | suggest | admin (default admin)
  readonly VITE_ADMIN_MOCK_TIER?: string;
}
