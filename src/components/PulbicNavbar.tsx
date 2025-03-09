import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import Planner from "../pages/Planner";
import ChatBot from "../pages/ChatBot";
import LoginPage from "../pages/LoginPage";
import SignUp from "../pages/SignUp";
import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

const PublicNavbar = () => {
  return (
    <AuthProvider>
      <nav className="p-8 fixed w-full z-10">
        <div className="flex items-center justify-between w-full">
          <Link to="/" className="ml-0">
            <img src="/Sage_Logo_Light.svg" alt="SAGE" className="h-8 w-auto" />
          </Link>
          <ul className="flex items-center space-x-6 mr-0">
            <li className="flex-row">
              <Link
                to="/planner"
                className="flex items-center space-x-2 text-white hover:text-gray-200 text-base font-semibold"
              >
                <img
                  src="/PlannerIcon.png"
                  alt="Planner"
                  className="h-6 w-auto"
                />
                <span>Plan your degree</span>
              </Link>
            </li>
            <li className="flex-row">
              <Link
                to="/chatbot"
                className="flex items-center space-x-2 text-white hover:text-gray-200 text-base font-semibold"
              >
                <img
                  src="/ChatbotIcon.png"
                  alt="Chatbot"
                  className="h-6 w-auto"
                />
                <span>Start a chat</span>
              </Link>
            </li>
            <li>
              <Link
                to="/login"
                className="bg-[#5AED86] text-black text-base px-8 py-3 rounded-full font-semibold hover:bg-green-600 transition duration-300"
              >
                Login
              </Link>
            </li>
          </ul>
        </div>
      </nav>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUp />} />
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
    </AuthProvider>
  );
};

export default PublicNavbar;
