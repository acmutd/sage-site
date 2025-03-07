import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import PublicNavbar from "./components/PulbicNavbar";
import AppNavbar from "./components/AppNavbar";
import { AuthProvider } from "./context/AuthContext";

const App = () => {
  return (
    <div className="flex flex-col h-screen">
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </div>
  );
};

const AppContent = () => {
  const location = useLocation();

  const publicRoutes = ["/", "/signup", "/login"];
  return (
    <div className="flex flex-col h-screen">
      {publicRoutes.includes(location.pathname) ? (
        <PublicNavbar />
      ) : (
        <AppNavbar />
      )}
    </div>
  );
};

export default App;
