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
import ProtectedRoute from "./ProtectedRoute";
import { RouteIcon, MessageCirclePlusIcon } from "lucide-react";

const AppNavbar = () => {
  return (
    <>
      <nav className="bg-[#F9FBF9] p-4">
        <div className="flex items-center justify-start w-full">
          <Link to="/" className="ml-0">
            <div className="h-12 w-12 bg-black rounded-3xl flex items-center justify-center mr-8">
              <img src="/LogoPlaceholder.png" alt="SAGE" className="h-6 w-6" />
            </div>
          </Link>
          <ul className="flex items-center space-x-6 mr-0">
            <li className="flex-row">
              <Link
                to="/planner"
                className="flex items-center space-x-2 p-2 px-8 rounded-3xl bg-[#C1E3CB] text-black hover:text-gray-200 text-base font-semibold"
              >
                {/* <img
                  src="/RouteBlack.png"
                  alt="Planner"
                  className="h-6 w-auto"
                /> */}
                <RouteIcon />
                <span>Plan your degree</span>
              </Link>
            </li>
            <li className="flex-row">
              <Link
                to="/chatbot"
                className="flex items-center space-x-2 p-2 px-8 rounded-3xl bg-[#C1E3CB] text-black hover:text-gray-200 text-base font-semibold"
              >
                <MessageCirclePlusIcon />
                <span>Start a chat</span>
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
    </>
  );
};

export default AppNavbar;
