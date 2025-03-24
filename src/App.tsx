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

const App = () => {
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
    </div>
  );
};

export default App;
