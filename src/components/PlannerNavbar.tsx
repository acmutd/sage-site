import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Route, MessageCirclePlus, UserRound, ListTodoIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import MobileNavbar from './MobileNavbar';
import PlannerSidebarContent from "@/components/planner/PlannerSidebarContent";

const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT as string | undefined;

interface PlannerNavbarProps {
  requirements: any[];
  expandedCategories: Record<number, boolean>;
  onToggleCategory: (index: number) => void;
  transcriptData: any;
  onDropCourse?: (courseId: string, sourceYear: string, sourceSemesterIndex: number) => void;
  placedSuggestedCourses?: Set<string>;
  onRestartOnboarding?: () => void;
}

const PlannerNavbar: React.FC<PlannerNavbarProps> = ({ 
  requirements,
  expandedCategories,
  onToggleCategory,
  transcriptData,
  onDropCourse,
  placedSuggestedCourses,
  onRestartOnboarding
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  const [isInWebapp, setIsInWebapp] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string>("");

  useEffect(() => {
    const updateProfilePicture = () => {
      const cachedType = localStorage.getItem('profilePictureType');
      if (cachedType) {
        const type = parseInt(cachedType);
        if (type === 0 && user?.photoURL) {
          setProfilePicture(user.photoURL);
        } else {
          setProfilePicture(`/assets/profile_pics/${type}.png`);
        }
      } else if (user?.photoURL) {
        setProfilePicture(user.photoURL);
      }
    };
    updateProfilePicture();
    window.addEventListener('storage', updateProfilePicture);
    return () => window.removeEventListener('storage', updateProfilePicture);
  }, [user?.photoURL]);

  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/forgot-password") {
      setIsInWebapp(false);
    } else {
      setIsInWebapp(true);
    }
  }, [location]);

  return (
    <>
      {/* Desktop navbar */}
      {ENVIRONMENT === 'development' && (
        <div className="fixed top-0 left-0 right-0 h-4 bg-purple-600 text-white text-center text-xs font-medium z-[200] shadow-sm flex items-center justify-center">
          Dev Environment
        </div>
      )}

      <nav className={`
        ${isInWebapp ? "bg-bglight border-b-[1px] shadow-sm" : undefined} 
        py-2.5 px-6 fixed w-full z-10 hidden md:block
        ${ENVIRONMENT === 'development' ? 'top-4' : 'top-0'}
      `}>
        <div className="flex items-center justify-between w-full">
          <Link to="/" className="ml-0 flex-shrink-0">
            <img src={isInWebapp ? "/Sage_Logo_Dark.svg" : "/Sage_Logo_Light.svg"} alt="SAGE" className="h-8 w-auto" />
          </Link>
          <ul className="flex items-center space-x-6 mr-0">
            <li>
              <Link to="/planner" className={`${isInWebapp ? "text-textdark hover:text-gray-500" : "text-textlight hover:text-gray-200"} flex items-center gap-2`}>
                <Route className="stroke-accent" />
                Plan your degree
              </Link>
            </li>
            <li>
              <Link to="/chatbot" className={`${isInWebapp ? "text-textdark hover:text-gray-500" : "text-textlight hover:text-gray-200"} flex items-center gap-2`}>
                <MessageCirclePlus className="stroke-accent" />
                Start a chat
              </Link>
            </li>
            <li>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <div className="p-2 rounded-full">
                      {profilePicture ? (
                        <img src={profilePicture} alt="Profile" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <UserRound className="stroke-textdark"/>
                      )}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-bglight flex flex-col p-2 gap-2 mr-6 items-center rounded-sm">
                    <DropdownMenuItem className="focus:bg-innercontainer w-full">
                      <Link to="/profile" className="text-textdark hover:text-gray-700 flex flex-row w-full justify-start items-center gap-2">
                        <UserRound className="stroke-accent" />
                        Your Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="focus:bg-innercontainer w-full">
                      <button onClick={logout} className="bg-destructive text-textlight text-base px-6 py-1.5 rounded-full font-semibold hover:bg-red-700 transition duration-300">
                        Sign Out
                      </button>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/login" className="bg-accent text-textdark text-base px-8 py-3 rounded-full font-semibold hover:bg-buttonhover transition duration-300">
                  Login
                </Link>
              )}
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile navbar with sidebar */}
      <MobileNavbar
        isInWebapp={isInWebapp}
        sidebarIcon={<ListTodoIcon className={isInWebapp ? "stroke-textdark" : "stroke-textlight"} />}
        sidebarContent={(onClose) => (
          <PlannerSidebarContent
            onClose={onClose}
            requirements={requirements}
            expandedCategories={expandedCategories}
            onToggleCategory={onToggleCategory}
            transcriptData={transcriptData}
            onDropCourse={onDropCourse}
            placedSuggestedCourses={placedSuggestedCourses}
            onRestartOnboarding={onRestartOnboarding}
          />
        )}
      />
    </>
  );
};

export default PlannerNavbar;