import { useAuth } from "../context/AuthContext";
import { MessagesSquare } from "lucide-react";
import { useEffect } from "react";
import {
  DevEnvironmentBanner,
  MobileNavbar,
  NavBrand,
  NavPrimaryLinks,
  UserProfileMenu,
  useRouteMode,
} from "@sage/ui";
import { useChatbot } from "../hooks/useChatbot";
import ChatSidebarContent from '@/components/chatbot/ChatSidebarContent';

const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT as string | undefined;

const ChatBotNavbar = () => {
  const { user, logout, profilePicture } = useAuth();
  const chatHook = useChatbot();
  const { initialLoad } = chatHook;
  const { isInWebapp } = useRouteMode();
  useEffect(() => {
    initialLoad();
  }, []);

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
          <NavBrand isDarkMode={isDarkMode} />
          <ul className="flex items-center space-x-6 mr-0">
            <NavPrimaryLinks isDarkMode={isDarkMode} />
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
        profilePicture={profilePicture}
        sidebarIcon={<MessagesSquare className={isDarkMode ? "stroke-textlight" : "stroke-textdark"} />}
        sidebarContent={(onClose) => <ChatSidebarContent onClose={onClose} chatHook={chatHook} />}
      />
    </>
  );
};

export default ChatBotNavbar;