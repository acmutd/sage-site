import { Link } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <AuthProvider>
      <nav className="py-4 px-6 fixed w-full z-10">
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
              {user ? (
                // If user is logged in, show Sign Out button
                <button
                  onClick={logout} // Calls logout function
                  className="bg-red-500 text-white text-base px-6 py-1.5 rounded-full font-semibold hover:bg-red-600 transition duration-300"
                >
                  Sign Out
                </button>
              ) : (
                // If no user, show Login button
                <Link
                  to="/login"
                  className="bg-[#5AED86] text-black text-base px-8 py-3 rounded-full font-semibold hover:bg-green-600 transition duration-300"
                >
                  Login
                </Link>
              )}
            </li>
          </ul>
        </div>
      </nav>
    </AuthProvider>
  );
};

export default Navbar;
