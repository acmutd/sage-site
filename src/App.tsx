import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import ChatBotNavbar from "./components/ChatBotNavbar";
import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignUp";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Planner from "./pages/PlannerPage";
import PublicRoute from "./components/PublicRoute";
import ChatBot from "./pages/ChatBot";
import Profile from "./pages/Profile";

// Component to conditionally render navbar based on route
const ConditionalNavbar = () => {
  const location = useLocation();
  
  // Show ChatBotNavbar only on the chatbot route
  if (location.pathname === "/chatbot") {
    return <ChatBotNavbar />;
  }
  
  // Show regular Navbar for all other routes
  return <Navbar />;
};

const App = () => {

  return (
    <div className="flex flex-col h-screen">
      <AuthProvider>
        <Router>
          <ConditionalNavbar />
          <div className="min-h-screen">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/signup" 
                element={
                  <PublicRoute>
                    <SignupPage />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/forgot-password" 
                element={
                  <PublicRoute>
                    <ForgotPasswordPage />
                  </PublicRoute>
                } 
              />
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
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>

      {/* Global Warning Modal */}
    </div>
  );
};

export default App;
