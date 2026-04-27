import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { SidebarCollapsedRail } from "./SidebarCollapsedRail";
import { SidebarPrimaryAction } from "./SidebarPrimaryAction";
import { SidebarCollapseToggle } from "./SidebarCollapseToggle";

export interface SidebarActionItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  dataTour?: string;
}

export interface SidebarTemplateProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  primaryAction?: SidebarActionItem;
  collapsedActions?: SidebarActionItem[];
  renderExpandedContent?: ReactNode;
  renderCollapsedFooter?: ReactNode;
  isMobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  className?: string;
  collapsedRailClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
  expandedWidthClassName?: string;
  collapsedWidthClassName?: string;
  expandedRoundedClassName?: string;
  collapsedRoundedClassName?: string;
}

export function SidebarTemplate({
  isCollapsed,
  onToggleCollapse,
  primaryAction,
  collapsedActions = [],
  renderExpandedContent,
  renderCollapsedFooter,
  className,
  collapsedRailClassName,
  contentClassName,
  expandedWidthClassName = "w-80",
  collapsedWidthClassName = "w-20",
  expandedRoundedClassName = "rounded-lg",
  collapsedRoundedClassName = "rounded-md",
}: SidebarTemplateProps) {
  return (
    <div
      className={cn(
        "bg-bglight border border-border transition-all duration-300 flex flex-col h-full",
        isCollapsed ? collapsedWidthClassName : expandedWidthClassName,
        isCollapsed ? collapsedRoundedClassName : expandedRoundedClassName,
        className
      )}
    >
      {isCollapsed ? (
        <SidebarCollapsedRail
          actions={collapsedActions}
          onToggleCollapse={onToggleCollapse}
          footer={renderCollapsedFooter}
          className={collapsedRailClassName}
        />
      ) : (
        <div className={cn("flex-1 overflow-y-auto", contentClassName)} style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <div className={cn("flex items-center justify-between mb-6")}>
            {primaryAction ? (
              <SidebarPrimaryAction
                label={primaryAction.label}
                icon={primaryAction.icon}
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className={primaryAction.className}
                dataTour={primaryAction.dataTour}
              />
            ) : null}
            <SidebarCollapseToggle onToggleCollapse={onToggleCollapse} dataTour="sidebar-toggle" />
          </div>

          {renderExpandedContent}
        </div>
      )}
    </div>
  );
}
