import { Link, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { Menu, MessageCirclePlus, Route, UserRound} from "lucide-react";
import { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isInWebapp, setIsInWebapp] = useState(false);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);

  let location = useLocation().pathname;
  
  useEffect(() => {
    if (location === "/" || location === "/login" || location === "/signup" || location === "/forgot-password") {
      setIsInWebapp(false);
    }
    else {
      setIsInWebapp(true);
    }
  }, [location]);

  // onboarding modal active check
  useEffect(() => {
    const checkOnboarding = () => {
      const onboardingActive = document.body.hasAttribute('data-onboarding-active');
      console.log('Checking onboarding:', onboardingActive);
      setIsOnboardingActive(onboardingActive);
    };
  
    checkOnboarding();
    
    const observer = new MutationObserver(checkOnboarding);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-onboarding-active'] });
  
    return () => observer.disconnect();
  }, []);

  // Dark mode when: NOT in webapp OR onboarding is active
  // Light mode when: in webapp AND onboarding is NOT active
  const useDarkMode = !isInWebapp || isOnboardingActive;

  return (
    <AuthProvider>
      {/* Standard navbar */}
      <nav className={`
        ${!useDarkMode ? "bg-bglight border-b-[1px] shadow-sm" : undefined} 
        py-2.5 px-6 fixed w-full z-[70] hidden md:block
        `}>
        <div className="flex items-center justify-between w-full">
          <Link to="/" className="ml-0">
            <img src={useDarkMode ? "/Sage_Logo_Light.svg" : "/Sage_Logo_Dark.svg"} alt="SAGE" className="h-8 w-auto" />
          </Link>
          <ul className="flex items-center space-x-6 mr-0">
            <li className="flex-row">
              <Link
                to="/planner"
                className={`${useDarkMode ? "text-textlight hover:text-gray-200" : "text-textdark hover:text-gray-500"}
                flex items-center gap-2`}
              >
                <Route className="stroke-accent" />
                Plan your degree
              </Link>
            </li>
            <li className="flex-row">
              <Link
                to="/chatbot"
                className={`${useDarkMode ? "text-textlight hover:text-gray-200" : "text-textdark hover:text-gray-500"}
                flex items-center gap-2`}
              >
                <MessageCirclePlus className="stroke-accent" />
                Start a chat
              </Link>
            </li>
            <li>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <div className="bg-secondary p-2 rounded-full">
                      <UserRound className="stroke-textdark"/>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className={`bg-bglight flex flex-col p-2 gap-2 mr-6 items-center rounded-sm z-[80]`}
                  >
                    <DropdownMenuItem className="focus:bg-innercontainer w-full">
                      <Link
                        to="/profile"
                        className={`text-textdark hover:text-gray-700 flex flex-row w-full justify-start items-center gap-2`}
                      >
                        <UserRound className="stroke-accent" />
                        Your Profile
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="focus:bg-innercontainer w-full">
                      <button
                        onClick={logout}
                        className="bg-destructive text-textlight text-base px-6 py-1.5 rounded-full font-semibold hover:bg-red-700 transition duration-300"
                      >
                        Sign Out
                      </button>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  to="/login"
                  className="bg-accent text-textdark text-base px-8 py-3 rounded-full font-semibold hover:bg-buttonhover transition duration-300"
                >
                  Login
                </Link>
              )}
            </li>
          </ul>
        </div>
      </nav>

      {/* Dropdown navbar when screen width < md (768px) */}
      <nav className={`
        ${!useDarkMode ? "bg-bglight border-b-[1px] shadow-sm" : undefined} 
        py-4 px-6 fixed w-full h-[4.2rem] z-[70] md:hidden block
        `}>
        <div className="flex items-center justify-between w-full">
          <Link to="/" className="ml-0">
            <img src={useDarkMode ? "/Sage_Logo_Light.svg" : "/Sage_Logo_Dark.svg"} alt="SAGE" className="h-8 w-auto" />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Menu className={useDarkMode ? "stroke-textlight" : "stroke-textdark"} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className={`bg-bglight flex flex-col p-2 gap-2 mr-6 items-center rounded-sm z-[80]`}>
              <DropdownMenuItem className="focus:bg-innercontainer w-full">
                <Link
                  to="/planner"
                  className={`text-textdark hover:text-gray-700 flex flex-row w-full justify-start items-center gap-2`}
                >
                  <Route className="stroke-accent" />
                  Plan your degree
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-innercontainer w-full">
                <Link
                  to="/chatbot"
                  className={`text-textdark hover:text-gray-700 flex flex-row w-full justify-start items-center gap-2`}
                >
                  <MessageCirclePlus className="stroke-accent" />
                  Start a chat
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem className="focus:bg-innercontainer w-full">
                {user ? (
                  <Link
                    to="/profile"
                    className={`text-textdark hover:text-gray-700 flex flex-row w-full justify-start items-center gap-2`}
                  >
                    <UserRound className="stroke-accent" />
                    Your Profile
                  </Link>
                ) : (
                  <></>
                )}
              </DropdownMenuItem>

              <DropdownMenuItem className="focus:bg-transparent w-full">
                {user ? (
                  <button
                    onClick={logout}
                    className="bg-destructive w-full text-textlight text-base px-6 py-1.5 rounded-full font-semibold hover:bg-red-700 transition duration-300"
                  >
                    Sign Out
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="flex-1 text-center bg-accent text-textdark text-base px-8 py-3 rounded-full font-semibold hover:bg-buttonhover transition duration-300"
                  >
                    Login
                  </Link>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </AuthProvider>
  );
};

export default Navbar;