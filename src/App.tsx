import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignUp";
import ProtectedRoute from "./components/ProtectedRoute";
import Planner from "./pages/Planner";
import ChatBot from "./pages/ChatBot";
import { useState, useEffect } from "react";

const App = () => {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const alreadyShown = sessionStorage.getItem("mobileWarningShown");

    if (isMobile && !alreadyShown) {
      setShowWarning(true);
      sessionStorage.setItem("mobileWarningShown", "true");
    }
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <AuthProvider>
        <Router>
          <Navbar /> {/* Always show PublicNavbar */}
          <div className="min-h-screen">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route
                path="/planner"
                element={
                  <ProtectedRoute>
                    <Planner />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chatbot"
                element={
                  <ProtectedRoute>
                    <ChatBot />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>

      {/* Global Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-sm text-center shadow-lg">
            <h2 className="text-xl font-bold mb-4">Mobile View Detected</h2>
            <p className="text-gray-700 mb-4">
              This website is best experienced on a desktop. Please switch to a
              larger screen.
            </p>
            <button
              onClick={() => setShowWarning(false)}
              className="bg-[#5AED86] px-6 py-2 rounded-full font-semibold text-black hover:bg-[#45c970] transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
