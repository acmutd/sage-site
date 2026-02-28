import { Combobox } from "@/components/ui/Combobox";

interface Program {
  id?: string | number;
  title: string;
  type: string;
  level?: string;
  status: string;
}

interface ProgramComboboxProps {
  suggestions: Program[];
  onSelect: (program: Program) => void;
}

export function ProgramCombobox({ suggestions, onSelect }: ProgramComboboxProps) {
  return (
    <Combobox<Program>
      items={suggestions}
      getLabel={(p) =>
        p.type === "Certificate" ? p.title : `${p.title} (${p.type})`
      }
      getDescription={(p) => p.level}
      searchKeys={["title", "type", "level"]}
      onSelect={onSelect}
      onCreate={(query) =>
        onSelect({ title: query, type: "", level: "", status: "Active" })
      }
      placeholder="Search programs…"
      triggerLabel="Add program"
    />
  );
}