import { Link } from "react-router-dom";
import type { ComponentType } from "react";

export interface NavLinkItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface NavPrimaryLinksProps {
  isDarkMode: boolean;
  links: NavLinkItem[];
  itemClassName?: string;
  linkClassName?: string;
  iconClassName?: string;
}

export function NavPrimaryLinks({
  isDarkMode,
  links,
  itemClassName = "",
  linkClassName,
  iconClassName = "stroke-accent",
}: NavPrimaryLinksProps) {
  const resolvedLinkClassName =
    linkClassName ??
    `${isDarkMode ? "text-textlight hover:text-gray-200" : "text-textdark hover:text-gray-500"} flex items-center gap-2`;

  return (
    <>
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <li key={link.to} className={itemClassName}>
            <Link to={link.to} className={resolvedLinkClassName}>
              <Icon className={iconClassName} />
              {link.label}
            </Link>
          </li>
        );
      })}
    </>
  );
}
