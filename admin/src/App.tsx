import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@sage/ui";
import DesktopOnlyNotice from "./components/DesktopOnlyNotice";
import LoginPage from "./pages/LoginPage";

export default function App() {
  return (
    <Router>
      {/* Same placement as SAGE main's login toasts */}
      <Toaster position="top-center" richColors closeButton theme="light" />
      {/* Admin has no mobile layout */}
      <DesktopOnlyNotice />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
