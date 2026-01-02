import { Pencil, PlusIcon } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import ProgramValidationB from "./ProgramValidationB";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const initialProgramsData = [
  {
    id: 1,
    title: "Computer Science",
    type: "Major",
    level: "Undergraduate",
    status: "Active",
  },
  {
    id: 2,
    title: "Cyber Defense",
    type: "Certificate",
    level: "Undergraduate",
    status: "Inactive",
  },
];

interface ProgramValidationAProps {
  onNext?: (updatedPrograms: any[]) => void;
  transcriptData: any;
  dropdownRef: any;
}

const ProgramValidationA: React.FC<ProgramValidationAProps> = ({ transcriptData, onNext, dropdownRef,
}) => {
  const [isEditing, setIsEditing] = useState(false); // State to toggle "Edit" mode
  const [programsData, setProgramsData] = useState(initialProgramsData); // State for program data
  const [editingProgram, setEditingProgram] = useState<{
    id?: number;
    title: string;
    type: string;
    level: string | null;
    status: string;
  } | null>(null);

  const handleFinish = () => {
    if (onNext) {
      onNext(programsData); // Return the updated programs to the parent if onNext is provided
    }
  };

  useEffect(() => {
    if (transcriptData) {
      const formattedPrograms = [
        ...transcriptData.majors.map((major: any) => ({
          id: `${major.name}-${major.start_date}`, // Unique ID
          title: major.name,
          type: "Major",
          level: major.program_level,
          status: major.status,
          school: major.school,
          start_date: major.start_date,
          concentration: major.concentration,
        })),
        ...transcriptData.minors.map((minor: any) => ({
          id: `${minor.name}-${minor.start_date}`, // Unique ID
          title: minor.name,
          type: "Minor",
          level: minor.program_level,
          status: minor.status,
          school: minor.school,
          start_date: minor.start_date,
          concentration: minor.concentration,
        })),
        ...transcriptData.certifications.map((certification: any) => ({
          id: `${certification.name}-${certification.start_date}`, // Unique ID
          title: certification.name,
          type: "Certificate",
          level: certification.program_level,
          status: certification.status,
          school: certification.school,
          start_date: certification.start_date,
          concentration: certification.concentration,
        })),
      ];
      setProgramsData(formattedPrograms);
    }
  }, [transcriptData]);

  console.log("transcriptData in ProgramValidationA: ", transcriptData);

  const handleRemove = (id: number) => {
    setProgramsData((prev) => prev.filter((program) => program.id !== id)); // Remove program by ID
    setIsEditing(false); // Exit "Edit" mode
  };

  const handleEdit = (program: any) => {
    setEditingProgram(program); // Set the program being edited
    setIsEditing(true); // Enter "Edit" mode
  };

  const handleSave = (updatedProgram: any) => {
    // Validate that title and type are not empty
    if (!updatedProgram.title || !updatedProgram.type) {
      console.error("Program title and type are required."); // Log an error or show a message
      return;
    }

    if (updatedProgram.id) {
      // Update existing program
      setProgramsData((prev) =>
        prev.map((program) =>
          program.id === updatedProgram.id ? updatedProgram : program
        )
      );
    } else {
      // Add new program
      const newProgram = { ...updatedProgram, id: Date.now() }; // Generate a unique ID
      setProgramsData((prev) => [...prev, newProgram]);
    }
    setIsEditing(false); // Exit "Edit" mode
  };

  // Define the sorting order for types
  const statusOrder = ["Active", "Inactive"];
  const levelOrder = ["Undergraduate", "Graduate", null];
  const typeOrder = ["Major", "Minor", "Certificate"];

  // Sort programsData based on status, level, type, and title
  const sortedPrograms = useMemo(() => {
    return [...programsData].sort((a, b) => {
      // Sort by status
      const statusA = statusOrder.indexOf(a.status);
      const statusB = statusOrder.indexOf(b.status);
      if (statusA !== statusB) return statusA - statusB;

      // Sort by level
      const levelA = levelOrder.indexOf(a.level);
      const levelB = levelOrder.indexOf(b.level);
      if (levelA !== levelB) return levelA - levelB;

      // Sort by type
      const typeA = typeOrder.indexOf(a.type);
      const typeB = typeOrder.indexOf(b.type);
      if (typeA !== typeB) return typeA - typeB;

      // Sort by title alphabetically
      return a.title.localeCompare(b.title);
    });
  }, [programsData]);

  if (isEditing && editingProgram) {
    return (
      <ProgramValidationB
        program={editingProgram} // Pass the program being edited
        onNext={() => setIsEditing(false)}
        onRemove={handleRemove}
        onSave={handleSave}
        transcriptData={transcriptData} // Pass the save handler
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col items-start mb-6">
        <h3>Are these programs right?</h3>
        <p>
          We detected these programs on your transcript — let us know which
          ones you&apos;re still working on.
        </p>
      </div>
      <div className="flex flex-col gap-4 bg-gray-100 p-2 rounded-sm">
        {sortedPrograms.map((program) => (
          <Card key={program.id} className="flex items-center py-3 relative">
            <CardContent className="flex items-center">
              <div className="flex flex-col">
                <h4 className="mb-1">
                  {program.type === "Certificate"
                    ? `${program.title}`
                    : `${program.title} (${program.type})`}
                </h4>
                {program.level && <p className="text-sm mb-1">{program.level}</p>}
                <div className="flex items-center gap-2 leading-none">
                  <Pencil
                    size={18}
                    className="cursor-pointer"
                    onClick={() => handleEdit(program)}
                  />
                  <span
                    className="text-base cursor-pointer"
                    onClick={() => handleEdit(program)}
                  >
                    Edit
                  </span>
                </div>
              </div>
              <div
                className="dropdown-container absolute right-4 flex flex-col w-[248px] gap-2.5 p-[5px] bg-redesign-stylesbg-light rounded-sm border border-slate-300 z-[70]"
                ref={dropdownRef}
                onClick={(e) => e.stopPropagation()}
              >
                <Select
                  defaultValue={program.status.toLowerCase()}
                  onValueChange={(value) => {
                    const updatedProgram = { ...program, status: value.charAt(0).toUpperCase() + value.slice(1) }; // Capitalize the status
                    handleSave(updatedProgram); // Save the updated program
                  }}
                >
                  <SelectTrigger
                    className="dropdown-trigger flex items-center gap-2 px-2 py-1.5 relative self-stretch w-full flex-[0_0_auto] bg-transparent border-none"
                  >
                    <SelectValue className="relative flex-1 font-body-regular font-[number:var(--body-regular-font-weight)] text-redesign-stylesdark-text text-[length:var(--body-regular-font-size)] tracking-[var(--body-regular-letter-spacing)] leading-[var(--body-regular-line-height)] [font-style:var(--body-regular-font-style)]" />
                  </SelectTrigger>
                  <SelectContent className="z-[80] p-1">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button
          variant="outline"
          className="flex items-center gap-2 border-dashed border-gray-400 border w-full justify-start text-gray-600 rounded-sm"
          onClick={() => {
            setEditingProgram({
              title: "",
              type: "",
              level: "",
              status: "Active",
            }); // Empty fields for new program
            setIsEditing(true); // Enter edit mode
          }}
        >
          <PlusIcon size={16} />
          Add program
        </Button>
      </div>
      <div className="flex justify-end mt-8">
        {onNext && (
          <button
            className="w-auto px-8 p-2 bg-accent text-black rounded-lg hover:bg-blue-700 transition"
            onClick={handleFinish}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default ProgramValidationA;