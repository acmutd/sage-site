import type { ReactNode } from "react";
import { ArrowLeftToLine } from "lucide-react";

interface SidebarCollapseToggleProps {
  onToggleCollapse: () => void;
  className?: string;
  dataTour?: string;
  icon?: ReactNode;
  ariaLabel?: string;
}

export function SidebarCollapseToggle({ 
  onToggleCollapse, 
  className, 
  dataTour,
  icon = <ArrowLeftToLine className="w-5 h-5 text-gray-500" />,
  ariaLabel = "Toggle sidebar"
}: SidebarCollapseToggleProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={className ?? "p-2 hover:bg-gray-200 rounded"}
      onClick={(event) => {
        event.stopPropagation();
        onToggleCollapse();
      }}
      data-tour={dataTour}
    >
      {icon}
    </button>
  );
}
