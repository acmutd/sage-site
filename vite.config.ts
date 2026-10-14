import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ["./src/test/setup.ts", "./src/test/env-fixes.ts"],
    globals: true,
    env: {
      VITE_CRUD_API: 'http://localhost:3000/CRUD',
    },
  },
});
