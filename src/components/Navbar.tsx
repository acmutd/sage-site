import React from "react";
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
import ProtectedRoute from "./ProtectedRotue";

const Navbar = () => {
  return (
    <AuthProvider>
      <Router>
        <nav className="bg-[#181818] p-4 shadow-md">
          <div className="flex items-center justify-between w-full">
            <Link to="/" className="ml-0">
              <img src="/SAGE-Name.png" alt="SAGE" className="h-8 w-auto" />
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
                  className="bg-[#5AED86] text-black text-base px-4 py-1 rounded-2xl font-semibold hover:bg-green-600 transition duration-300"
                >
                  Login
                </Link>
              </li>
            </ul>
          </div>
        </nav>
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
      </Router>
    </AuthProvider>
  );
};

export default Navbar;
