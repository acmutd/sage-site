import { Link } from "react-router-dom";
import { UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

interface UserProfileMenuProps {
  user: unknown;
  logout: () => void;
  profilePicture?: string | null;
  triggerClassName?: string;
  triggerIconClassName?: string;
  imageClassName?: string;
  contentClassName?: string;
  profileLinkClassName?: string;
  loginButtonClassName?: string;
}

export function UserProfileMenu({
  user,
  logout,
  profilePicture,
  triggerClassName = "p-2 rounded-full",
  triggerIconClassName = "stroke-textdark",
  imageClassName = "w-9 h-9 rounded-full object-cover",
  contentClassName = "bg-bglight flex flex-col p-2 gap-2 mr-6 items-center rounded-sm",
  profileLinkClassName = "text-textdark hover:text-gray-700 flex flex-row w-full justify-start items-center gap-2",
  loginButtonClassName = "bg-accent text-textdark text-base px-8 py-2 rounded-full font-semibold hover:bg-buttonhover transition duration-300",
}: UserProfileMenuProps) {
  return (
    <li>
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className={triggerClassName}>
              {profilePicture ? (
                <img
                  src={profilePicture}
                  data-clarity-mask="True"
                  referrerPolicy="no-referrer"
                  alt="Profile"
                  className={imageClassName}
                />
              ) : (
                <UserRound className={triggerIconClassName} />
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={contentClassName}>
            <DropdownMenuItem className="focus:bg-innercontainer w-full">
              <Link to="/profile" className={profileLinkClassName}>
                <UserRound style={{ width: "20px", height: "20px", minWidth: "20px" }} />
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
        <Link to="/login" className={loginButtonClassName}>
          Login
        </Link>
      )}
    </li>
  );
}
