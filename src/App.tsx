import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";

const App = () => {
  return (
    <div className="flex flex-col h-screen">
      <AuthProvider>
        <Router>
          <Navbar /> {/* Always show PublicNavbar */}
        </Router>
      </AuthProvider>
    </div>
  );
};

export default App;
