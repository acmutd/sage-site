import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, authChecking } = useAuth();
  
    if (authChecking) {
        return <>{children}</>;
      }

    if (user) {
        return <Navigate to="/" replace />;
    }
  
    return <>{children}</>;
};

export default PublicRoute;