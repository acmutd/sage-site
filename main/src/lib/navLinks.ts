import { Route, MessageCirclePlus, UserRound } from "lucide-react";
import type { NavLinkItem } from "@sage/ui";

export const PRIMARY_NAV_LINKS: NavLinkItem[] = [
  { to: "/planner", label: "Plan your degree", icon: Route },
  { to: "/chatbot", label: "Start a chat", icon: MessageCirclePlus },
];

export const MOBILE_NAV_LINKS: NavLinkItem[] = [
  ...PRIMARY_NAV_LINKS,
  { to: "/profile", label: "Your Profile", icon: UserRound },
];
