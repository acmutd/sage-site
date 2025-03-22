import { BrowserRouter as Router } from "react-router-dom";
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
