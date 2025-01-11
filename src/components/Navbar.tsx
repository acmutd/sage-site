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

const Navbar = () => {
  return (
    <Router>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/login">Login</Link>
          </li>
          <li>
            <Link to="/planner">Plan your degree</Link>
          </li>
          <li>
            <Link to="/chatbot">Start a chat</Link>
          </li>
        </ul>
      </nav>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/chatbot" element={<ChatBot />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default Navbar;
