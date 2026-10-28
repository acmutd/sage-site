import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@sage/ui";
import type { AdminAuthAdapter } from "./auth";
import { AdminSessionProvider, RequireAdminSession } from "./auth/AdminSession";
import DesktopOnlyNotice from "./components/DesktopOnlyNotice";
import AdminHomePage from "./pages/AdminHomePage";
import LoginPage from "./pages/LoginPage";

export default function App({ auth }: { auth: AdminAuthAdapter }) {
  return (
    <Router>
      {/* Same placement as SAGE main's login toasts */}
      <Toaster position="top-center" richColors closeButton theme="light" />
      {/* Admin has no mobile layout */}
      <DesktopOnlyNotice />
      <AdminSessionProvider auth={auth}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAdminSession>
                <AdminHomePage />
              </RequireAdminSession>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminSessionProvider>
    </Router>
  );
}
