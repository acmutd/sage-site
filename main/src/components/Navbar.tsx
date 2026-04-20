import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  DevEnvironmentBanner,
  MobileNavbar,
  NavBrand,
  NavPrimaryLinks,
  UserProfileMenu,
  useRouteMode,
} from "@sage/ui";

// check environment
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT as string | undefined;

const Navbar = () => {
  const { user, logout, profilePicture } = useAuth();
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);  
  const { isInWebapp } = useRouteMode();

  useEffect(() => {
    const navHeight = ENVIRONMENT === 'development' ? '6rem' : '4.2rem';
    document.documentElement.style.setProperty('--nav-height', navHeight);
  }, []);

  // onboarding modal active check
  useEffect(() => {
    const checkOnboarding = () => {
      const onboardingActive = document.body.hasAttribute('data-onboarding-active');
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
  const useLightNav = !useDarkMode;

  return (
    <>
      <DevEnvironmentBanner isDevelopment={ENVIRONMENT === 'development'} />

      <nav className={`
        ${useLightNav ? "bg-bglight border-b-[1px] shadow-sm" : undefined}
        py-2.5 px-6 fixed w-full z-[70] hidden md:block
        ${ENVIRONMENT === 'development' ? 'top-4' : 'top-0'}
      `}>
        <div className="flex items-center justify-between w-full">
          <NavBrand isDarkMode={useDarkMode} />
          <ul className="flex items-center space-x-6 mr-0">
            <NavPrimaryLinks
              isDarkMode={useDarkMode}
              itemClassName="flex-row"
              linkClassName={`${useDarkMode ? "text-textlight hover:text-gray-200" : "text-textdark hover:text-gray-500"} flex items-center gap-2`}
            />
            <UserProfileMenu
              user={user}
              logout={logout}
              profilePicture={profilePicture}
              triggerClassName={!profilePicture ? "bg-secondary p-2 rounded-full" : "p-2 rounded-full"}
              loginButtonClassName="bg-accent text-textdark text-base px-8 py-2 rounded-full font-semibold hover:bg-buttonhover transition duration-300"
            />
          </ul>
        </div>
      </nav>

      <MobileNavbar
        isInWebapp={useLightNav}
        isDarkMode={useDarkMode}
        isDevelopment={ENVIRONMENT === 'development'}
        user={user}
        logout={logout}
        profilePicture={profilePicture}
        showSidebar={false}
      />
    </>
  );
};

export default Navbar;