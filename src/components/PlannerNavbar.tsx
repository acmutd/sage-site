import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Route, MessageCirclePlus, UserRound, ListTodoIcon, Edit, Plus, Copy, Trash2, ChevronDown } from "lucide-react";
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
  availableSemesters?: Array<{yearKey: string, semesterIndex: number, title: string}>;
  onAddCourse?: (targetYear: string, targetSemesterIndex: number, course: any, sourceYear: string, sourceSemesterIndex: number, courseId?: string, isSuggested?: boolean) => void;
  onRestartOnboarding?: () => void;
  plans?: Array<{id: string, name: string}>;
  activePlanId?: string;
  onSwitchPlan?: (planId: string) => void;
  onNewPlan?: () => void;
  onDuplicatePlan?: () => void;
  onDeletePlan?: () => void;
  onRenamePlan?: (name: string) => void;
}

const PlannerNavbar: React.FC<PlannerNavbarProps> = ({ 
  requirements,
  expandedCategories,
  onToggleCategory,
  transcriptData,
  onDropCourse,
  placedSuggestedCourses,
  onRestartOnboarding,
  availableSemesters,
  onAddCourse,
  plans = [],
  activePlanId = '',
  onSwitchPlan,
  onNewPlan,
  onDuplicatePlan,
  onDeletePlan,
  onRenamePlan
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  const [isInWebapp, setIsInWebapp] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");

  const activePlan = plans.find(p => p.id === activePlanId);

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
          <div className="flex items-center gap-4">
            <Link to="/" className="ml-0 flex-shrink-0">
              <img src={isInWebapp ? "/Sage_Logo_Dark.svg" : "/Sage_Logo_Light.svg"} alt="SAGE" className="h-8 w-auto" />
            </Link>
            
            {/* Plan selector - only show on planner page */}
            {location.pathname === '/planner' && plans.length > 0 && (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm bg-white hover:bg-gray-50">
                    <span>{activePlan?.name || 'Select Plan'}</span>
                    <ChevronDown size={16} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-bglight">
                    {plans.map(plan => (
                      <DropdownMenuItem 
                        key={plan.id}
                        onClick={() => onSwitchPlan?.(plan.id)}
                        className="focus:bg-innercontainer cursor-pointer"
                      >
                        {plan.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <button 
                  onClick={() => {
                    setNewPlanName(activePlan?.name || '');
                    setShowRenameModal(true);
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded"
                  title="Rename plan"
                >
                  <Edit size={16} />
                </button>
                
                <button 
                  onClick={onNewPlan}
                  className="p-1.5 hover:bg-gray-100 rounded"
                  title="New plan"
                >
                  <Plus size={16} />
                </button>
                
                <button 
                  onClick={onDuplicatePlan}
                  className="p-1.5 hover:bg-gray-100 rounded"
                  title="Duplicate plan"
                >
                  <Copy size={16} />
                </button>
                
                <button 
                  onClick={() => {
                    if (plans.length === 1) return;
                    setShowDeleteModal(true);
                  }}
                  disabled={plans.length === 1}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete plan"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
          
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
            onAddCourse={onAddCourse}
            availableSemesters={availableSemesters}
          />
        )}
      />
      
      {/* Rename modal */}
      {showRenameModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
          onClick={() => setShowRenameModal(false)}
        >
          <div 
            className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-3 text-lg">Rename Plan</h3>
            <input
              type="text"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              className="border px-3 py-2 rounded w-full mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onRenamePlan?.(newPlanName);
                  setShowRenameModal(false);
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onRenamePlan?.(newPlanName);
                  setShowRenameModal(false);
                }}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-3 text-lg text-gray-800">
              Delete {activePlan?.name}?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              This plan and all its courses will be permanently deleted. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onDeletePlan?.();
                  setShowDeleteModal(false);
                }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlannerNavbar;