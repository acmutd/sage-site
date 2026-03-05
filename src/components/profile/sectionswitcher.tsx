import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export type ProfileSection = "Program Status" | "Conversations";

interface SectionSwitcherProps {
  active: ProfileSection;
  onChange: (section: ProfileSection) => void;
}

const SECTIONS: ProfileSection[] = ["Program Status", "Conversations"];

const SectionSwitcher: React.FC<SectionSwitcherProps> = ({ active, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-fit">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 group"
      >
        <h2 className="text-3xl font-semibold text-textdark group-hover:text-accent transition-colors duration-150">
          {active}
        </h2>
        <ChevronDown
          className={`w-6 h-6 text-textdark mt-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-border rounded-2xl shadow-lg overflow-hidden min-w-[200px]">
          {SECTIONS.map((section) => (
            <button
              key={section}
              onClick={() => { onChange(section); setOpen(false); }}
              className={`w-full text-left px-5 py-3 text-base font-medium transition-colors duration-150
                ${active === section
                  ? "bg-accent text-textdark"
                  : "text-textdark hover:bg-secondary"
                }
              `}
            >
              {section}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SectionSwitcher;