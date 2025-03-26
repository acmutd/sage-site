import { Link, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { MessageCirclePlus, Route } from "lucide-react";
import { useEffect, useState } from "react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isInWebapp, setIsInWebapp] = useState(false);

  let location = useLocation().pathname;
  useEffect(() => {
    console.log(location)
    if (location !== "/") {
      setIsInWebapp(true);
    }
    else {
      setIsInWebapp(false);
    }
    console.log(isInWebapp)
  }, [location]);

  return (
    <AuthProvider>
      <nav className={`
        ${isInWebapp ? "bg-bglight border-b-[1px] shadow-sm" : undefined} 
        py-4 px-6 fixed w-full z-10
        `}>
        <div className="flex items-center justify-between w-full">
          <Link to="/" className="ml-0">
            <img src={isInWebapp ? "/Sage_Logo_Dark.svg" : "/Sage_Logo_Light.svg"} alt="SAGE" className="h-8 w-auto" />
          </Link>
          <ul className="flex items-center space-x-6 mr-0">
            <li className="flex-row">
              <Link
                to="/planner"
                className={`${isInWebapp ? "text-textdark hover:text-gray-700" : "text-textlight hover:text-gray-200"}
                flex items-center gap-2`}
              >
                <Route className="stroke-accent" />
                Plan your degree
              </Link>
            </li>
            <li className="flex-row">
              <Link
                to="/chatbot"
                className={`${isInWebapp ? "text-textdark" : "text-textlight"}
                flex items-center gap-2 hover:text-gray-200"`}
              >
                <MessageCirclePlus className="stroke-accent" />
                Start a chat
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
