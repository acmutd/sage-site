import type { ReactNode } from "react";
import { ArrowRightToLine, PanelLeftDashed } from "lucide-react";
import { cn } from "../lib/utils";
import { SidebarCollapseToggle } from "./SidebarCollapseToggle";

interface SidebarCollapsedRailProps {
  actions: Array<{
    label: string;
    icon: ReactNode;
    onClick: () => void;
    className?: string;
    disabled?: boolean;
  }>;
  onToggleCollapse: () => void;
  footer?: ReactNode;
  className?: string;
}

export function SidebarCollapsedRail({ actions, onToggleCollapse, footer, className }: SidebarCollapsedRailProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-8 pt-8 h-full cursor-pointer hover:bg-[#F5F7F5]",
        className
      )}
      onClick={onToggleCollapse}
      role="button"
      tabIndex={0}
      aria-label="Expand sidebar"
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggleCollapse();
        }
      }}
    >
      <SidebarCollapseToggle
        onToggleCollapse={onToggleCollapse}
        icon={<ArrowRightToLine size={24} className="w-5 h-5 text-gray-500" />}
        ariaLabel="Expand sidebar"
      />

      <div className="flex flex-col items-center gap-4">
        {actions.map((action) => (
          <button
            key={action.label}
            aria-label={action.label}
            className={cn(
              "transition-all p-2 rounded-sm text-textdark border border-border bg-bglight hover:bg-border w-12 h-12 flex items-center justify-center",
              action.className
            )}
            onClick={(event) => {
              event.stopPropagation();
              if (!action.disabled) action.onClick();
            }}
            disabled={action.disabled}
          >
            {action.icon}
          </button>
        ))}
      </div>

      <div className="flex flex-grow" />

      <div className="w-12 h-12 flex items-center justify-center -translate-y-4">
        {footer ?? <PanelLeftDashed size={24} className="stroke-[#bbbbbb] group-hover/sidebar:stroke-[#dddddd] transition-colors duration-150" />}
      </div>
    </div>
  );
}
