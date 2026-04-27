import type { ReactNode } from "react";

interface SidebarPrimaryActionProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  dataTour?: string;
}

export function SidebarPrimaryAction({ label, icon, onClick, disabled, className, dataTour }: SidebarPrimaryActionProps) {
  return (
    <button
      aria-label={label}
      className={className ?? "flex transition-all duration-100 items-center space-x-2 py-2 px-8 rounded-3xl bg-accent text-textdark text-base hover:text-gray-700"}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      data-tour={dataTour}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
