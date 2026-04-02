import { Pencil, PlusIcon, TriangleAlert } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ProgramValidationB from "./ProgramValidationB";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from "@/context/AuthContext";
import { getCurrentCatalogYear } from "@/utils/studentInfo";

const CRUD_API = import.meta.env.VITE_CRUD_API as string | undefined;

const calculateCatalogYear = (semester: string): string => {
  if (!semester) return getCurrentCatalogYear();
  const [year, season] = semester.split(" ");
  return season === "Fall" ? year : (parseInt(year) - 1).toString();
};

async function fetchCatalog(year: string, user: any): Promise<any> {
  try {
    const token = await user?.getIdToken();
    if (!token) throw new Error("Failed to retrieve authentication token.");

    const resolvedYear = year === "latest" ? getCurrentCatalogYear() : year;
    const response = await fetch(`${CRUD_API}/catalog?year=${resolvedYear}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) return await response.json();
    return null;
  } catch (error) {
    console.error(`Error fetching catalog for year ${year}:`, error);
    return null;
  }
}

async function retrieveDegreeCatalog(transcriptData: any, user: any): Promise<any> {
  const activeMajor = transcriptData?.majors?.find((m: any) => m.status === "Active");
  const semesterString = activeMajor?.start_date;

  if (!semesterString) {
    console.error("No active major with start date found");
    return null;
  }

  let catalogYear = calculateCatalogYear(semesterString);
  const currentCatalogYear = getCurrentCatalogYear();
  if (parseInt(currentCatalogYear) - parseInt(catalogYear) > 6) {
    catalogYear = currentCatalogYear;
  }

  return fetchCatalog(catalogYear, user);
}

const initialProgramsData = [
  {
    id: 1,
    title: "Computer Science",
    type: "Major",
    level: "Undergraduate",
    status: "In Progress",
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
  onBack?: () => void;
  transcriptData: any;
  dropdownRef: any;
  showUploadOption?: boolean;
  onUploadClick?: () => void;
  isFirstTime?: boolean;
  catalogYear: "assigned" | "latest";
}

const getCurrentSemester = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const season = month >= 8 ? "Fall" : month >= 4 ? "Summer" : "Spring";
  return `${year} ${season}`;
};

const ProgramValidationA: React.FC<ProgramValidationAProps> = ({ transcriptData, onNext, onBack, dropdownRef, isFirstTime = true, catalogYear
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false); // State to toggle "Edit" mode
  const [programsData, setProgramsData] = useState(initialProgramsData); // State for program data
  const [editingProgram, setEditingProgram] = useState<{
    id?: number;
    title: string;
    type: string;
    level: string | null;
    status: string;
  } | null>(null);
  const [degreeCatalog, setDegreeCatalog] = useState<any>(null);
  const [latestCatalog, setLatestCatalog] = useState<any>(null);
  const [studentCatalogYear, setStudentCatalogYear] = useState<string>("");
  const latestCatalogYear = getCurrentCatalogYear();
  const hasFetched = useRef(false);

  // mount degree catalog
  useEffect(() => {
    if (!transcriptData || !user?.uid || hasFetched.current) return;
    hasFetched.current = true;

    const activeMajor = transcriptData?.majors?.find((m: any) => m.status === "Active");
    let resolvedYear = "";
    if (activeMajor?.start_date) {
      let year = calculateCatalogYear(activeMajor.start_date);
      const currentYear = getCurrentCatalogYear();
      if (parseInt(currentYear) - parseInt(year) > 6) year = currentYear;
      resolvedYear = year;
      setStudentCatalogYear(resolvedYear);
    }

    const isFreshman = resolvedYear === latestCatalogYear;

    retrieveDegreeCatalog(transcriptData, user).then(catalog => {
      setDegreeCatalog(catalog);
      if (isFreshman) setLatestCatalog(catalog);
    });

    if (!isFreshman) {
      fetchCatalog("latest", user).then(catalog => {
        setLatestCatalog(catalog);
      });
    }
  }, [transcriptData, user]);

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
      const newProgram = {
        ...updatedProgram,
        id: Date.now(),
        start_date: updatedProgram.start_date ?? getCurrentSemester(),
      };
      setProgramsData((prev) => [...prev, newProgram]);
    }
    setIsEditing(false); // Exit "Edit" mode
  };

  const invalidPrograms = useMemo(() => {
    const activeCatalog = catalogYear === "latest" ? latestCatalog : degreeCatalog;
    if (!activeCatalog) return new Set();

    const allTitles = new Set([
      ...(activeCatalog.undergraduate?.bachelor || []),
      ...(activeCatalog.undergraduate?.minor || []),
      ...(activeCatalog.undergraduate?.certificate || []),
      ...(activeCatalog.graduate?.masters || []),
      ...(activeCatalog.graduate?.doctorate || []),
      ...(activeCatalog.graduate?.certificate || []),
    ]);

    return new Set(
      programsData
        .filter(p => !allTitles.has(p.title))
        .map(p => p.id)
    );
  }, [programsData, catalogYear, latestCatalog, degreeCatalog]);

  const mapStatusToDropdown = (status: string) => {
    const mapping: Record<string, string> = {
      "Active": "in-progress",
      "In Progress": "in-progress",
      "Completed": "complete",
      "Withdrawn": "withdrawn"
    };
    return mapping[status] || "in-progress";
  };

  const mapDropdownToStatus = (value: string) => {
    const mapping: Record<string, string> = {
      "in-progress": "In Progress",
      "complete": "Completed",
      "withdrawn": "Withdrawn"
    };
    return mapping[value] || "In Progress";
  };

  // Define the sorting order for types
  const statusOrder = ["In Progress", "Completed", "Withdrawn"];
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
        program={editingProgram}
        onNext={() => setIsEditing(false)}
        onRemove={handleRemove}
        onSave={handleSave}
        transcriptData={transcriptData}
        degreeCatalog={degreeCatalog}
        latestCatalog={latestCatalog}
        studentCatalogYear={studentCatalogYear}
        latestCatalogYear={latestCatalogYear}
        catalogYear={catalogYear}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col items-start mb-6 z-[80]">
        <h3>Are these programs right?</h3>
        <p>
          We detected these programs on your transcript — let us know which
          ones you&apos;re still working on.
        </p>
      </div>
      <div className="flex flex-col gap-4 bg-gray-100 p-2 rounded-sm">
        {sortedPrograms.map((program) => (
          <Card className={`pt-3 pb-0 relative ${invalidPrograms.has(program.id) ? "border-red-400" : "pb-3"}`}>
            <CardContent className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${invalidPrograms.has(program.id) ? "pb-0" : ""}`}>
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
                className="dropdown-container flex flex-col w-full sm:w-[248px] gap-2.5 p-[5px] bg-redesign-stylesbg-light rounded-sm border border-slate-300 z-[70] flex-shrink-0"
                ref={dropdownRef}
                onClick={(e) => e.stopPropagation()}
              >
                <Select
                  value={mapStatusToDropdown(program.status)}
                  onValueChange={(value) => {
                    const updatedProgram = { ...program, status: mapDropdownToStatus(value) };
                    handleSave(updatedProgram);
                  }}
                >
                  <SelectTrigger
                    className="dropdown-trigger flex items-center gap-2 px-2 py-1.5 relative self-stretch w-full flex-[0_0_auto] bg-transparent border-none"
                  >
                    <SelectValue className="relative flex-1 font-body-regular font-[number:var(--body-regular-font-weight)] text-redesign-stylesdark-text text-[length:var(--body-regular-font-size)] tracking-[var(--body-regular-letter-spacing)] leading-[var(--body-regular-line-height)] [font-style:var(--body-regular-font-style)]" />
                  </SelectTrigger>
                  <SelectContent className="z-[80] p-1">
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="complete">Completed</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            {invalidPrograms.has(program.id) && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-t border-red-200 rounded-b-xl mt-2">
                <TriangleAlert className="w-3.5 h-3.5 stroke-red-500 flex-shrink-0" />
                <p className="text-xs text-red-500">
                  Not available in the latest catalog; replace or remove to continue.
                </p>
              </div>
            )}
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
      <div className={`flex items-center mt-8 ${isFirstTime ? 'justify-between' : 'justify-between'}`}>
        {onBack && (
          <button
            onClick={onBack}
            className="px-8 py-2 bg-accent text-black rounded-lg hover:bg-green-600 transition"
          >
            Back
          </button>
        )}

        <button
          disabled={invalidPrograms.size > 0}
          className="px-8 py-2 bg-accent text-black rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleFinish}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ProgramValidationA;