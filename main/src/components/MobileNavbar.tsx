import { Route, Menu, MessageCirclePlus, UserRound, ArrowLeftFromLine} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@sage/ui";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT as string | undefined;

interface MobileNavbarProps {
    isInWebapp: boolean;
    sidebarContent?: (onClose: () => void) => React.ReactNode;
    showSidebar?: boolean;
    sidebarIcon?: React.ReactNode;
  }

const MobileNavbar: React.FC<MobileNavbarProps> = ({ 
    isInWebapp, 
    sidebarContent,
    showSidebar = true,
    sidebarIcon
  }) => {
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      if (sidebarOpen) closeButtonRef.current?.focus();
    }, [sidebarOpen]);
    
    useEffect(() => {
        if (!sidebarOpen) return;
        const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setSidebarOpen(false);
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    
    }, [sidebarOpen]);
    
    useEffect(() => {
        document.body.style.overflow = sidebarOpen ? "hidden" : "";
    }, [sidebarOpen]);

    return (
      <>
      <nav className={`
        ${isInWebapp ? "bg-bglight border-b-[1px] shadow-sm" : undefined} 
        py-4 px-6 fixed w-full h-[4.2rem] z-10 md:hidden block
        ${ENVIRONMENT === 'development' ? 'top-4' : 'top-0'}
      `}>
        <div className="flex items-center justify-between w-full">
          {showSidebar && (
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
              className="p-2 rounded-md outline-none"
            >
              {sidebarIcon}
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Open navigation menu">
              <Menu className={isInWebapp ? "stroke-textdark" : "stroke-textlight"} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-bglight flex flex-col p-2 gap-2 mr-6 items-center rounded-sm">
              <DropdownMenuItem className="focus:bg-innercontainer w-full">
                <Link to="/planner" className="text-textdark hover:text-gray-700 flex flex-row w-full justify-start items-center gap-2">
                  <Route className="stroke-accent" />
                  Plan your degree
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-innercontainer w-full">
                <Link to="/chatbot" className="text-textdark hover:text-gray-700 flex flex-row w-full justify-start items-center gap-2">
                  <MessageCirclePlus className="stroke-accent" />
                  Start a chat
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-innercontainer w-full">
                <Link to="/profile" className="text-textdark hover:text-gray-700 flex flex-row w-full justify-start items-center gap-2">
                  <UserRound className="stroke-accent" />
                  Your Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-innercontainer w-full">
                {user ? (
                  <button onClick={logout} className="bg-destructive w-full text-textlight text-base px-6 py-1.5 rounded-full font-semibold hover:bg-red-700 transition duration-300">
                    Sign Out
                  </button>
                ) : (
                  <Link to="/login" className="flex-1 text-center bg-accent text-textdark text-base px-8 py-3 rounded-full font-semibold hover:bg-buttonhover transition duration-300">
                    Login
                  </Link>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Overlay */}
      {showSidebar && (
        <div
          className={`fixed inset-0 z-30 md:hidden transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={() => setSidebarOpen(false)}
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        />
      )}

      {/* Sidebar */}
      {showSidebar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-hidden={!sidebarOpen}
          className={`
            fixed left-0 top-0 h-full w-[84%] max-w-[22rem] z-40 md:hidden
            bg-bglight text-textdark border-r
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/" onClick={() => setSidebarOpen(false)}>
              <img src={isInWebapp ? "/Sage_Logo_Dark.svg" : "/Sage_Logo_Light.svg"} alt="SAGE" className="h-8 w-auto" />
            </Link>
            <button ref={closeButtonRef} onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent">
              <ArrowLeftFromLine />
            </button>
          </div>

          {/* Content */}
          {sidebarContent?.(()=> setSidebarOpen(false))}
        </div>
      )}
    </>
  );
};

export default MobileNavbar;