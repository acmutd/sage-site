import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { ListTodoIcon } from "lucide-react";
import { DevEnvironmentBanner, MobileNavbar, NavBrand, NavPrimaryLinks, UserProfileMenu } from "@sage/ui";
import { useRouteMode } from "../hooks/useRouteMode";
import { PRIMARY_NAV_LINKS, MOBILE_NAV_LINKS } from "../lib/navLinks";

const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT as string | undefined;

interface PlannerNavbarProps {
  sidebarContent: (onClose: () => void) => ReactNode;
}

const PlannerNavbar: React.FC<PlannerNavbarProps> = ({ sidebarContent }) => {
  const { user, logout, profilePicture } = useAuth();
  const { isInWebapp } = useRouteMode();
  const isDarkMode = !isInWebapp;

  return (
    <>
      <DevEnvironmentBanner isDevelopment={ENVIRONMENT === 'development'} />

      <nav className={`
        ${isInWebapp ? "bg-bglight border-b-[1px] shadow-sm" : undefined}
        py-2.5 px-6 fixed w-full z-10 hidden md:block
        ${ENVIRONMENT === 'development' ? 'top-4' : 'top-0'}
      `}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <NavBrand isDarkMode={isDarkMode} className="ml-0 flex-shrink-0" />
          </div>

          <ul className="flex items-center space-x-6 mr-0">
            <NavPrimaryLinks isDarkMode={isDarkMode} links={PRIMARY_NAV_LINKS} />
            <UserProfileMenu user={user} logout={logout} profilePicture={profilePicture} />
          </ul>
        </div>
      </nav>

      <MobileNavbar
        isInWebapp={isInWebapp}
        isDarkMode={isDarkMode}
        isDevelopment={ENVIRONMENT === 'development'}
        user={user}
        logout={logout}
        sidebarIcon={<ListTodoIcon className={isDarkMode ? "stroke-textlight" : "stroke-textdark"} />}
        sidebarContent={sidebarContent}
        navLinks={MOBILE_NAV_LINKS}
      />
    </>
  );
};

export default PlannerNavbar;
