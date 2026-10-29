import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { loadAdminAuth } from "./auth";
import { loadOfficerDirectory } from "./officers";

Promise.all([loadAdminAuth(), loadOfficerDirectory()]).then(([auth, directory]) => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App auth={auth} directory={directory} />
    </StrictMode>,
  );
});
