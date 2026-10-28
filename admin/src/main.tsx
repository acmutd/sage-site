import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { loadAdminAuth } from "./auth";

loadAdminAuth().then((auth) => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App auth={auth} />
    </StrictMode>,
  );
});
