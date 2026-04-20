import { Link } from "react-router-dom";
import { MessageCirclePlus, Route } from "lucide-react";

interface NavPrimaryLinksProps {
  isDarkMode: boolean;
  itemClassName?: string;
  linkClassName?: string;
  iconClassName?: string;
}

export function NavPrimaryLinks({
  isDarkMode,
  itemClassName = "",
  linkClassName,
  iconClassName = "stroke-accent",
}: NavPrimaryLinksProps) {
  const resolvedLinkClassName =
    linkClassName ??
    `${isDarkMode ? "text-textlight hover:text-gray-200" : "text-textdark hover:text-gray-500"} flex items-center gap-2`;

  return (
    <>
      <li className={itemClassName}>
        <Link to="/planner" className={resolvedLinkClassName}>
          <Route className={iconClassName} />
          Plan your degree
        </Link>
      </li>
      <li className={itemClassName}>
        <Link to="/chatbot" className={resolvedLinkClassName}>
          <MessageCirclePlus className={iconClassName} />
          Start a chat
        </Link>
      </li>
    </>
  );
}
