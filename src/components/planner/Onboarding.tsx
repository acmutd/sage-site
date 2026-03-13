import { useRef, useEffect, useState } from "react";
import FileUploader from "@/components/planner/FileUpload";
import { useAuth } from "@/context/AuthContext";
import ProgramValidationA from "@/components/planner/ProgramValidationA"
import ClassValidationA from "@/components/planner/ClassValidationA"
import { SquareAsterisk } from "lucide-react";
import { calculateCatalogYear, calculateLatestYear } from "@/utils/studentInfo";

interface OnboardingProps {
  onClose: () => void;
  onFinish: (data: any) => void;
  setTranscriptData: (data: any) => void;
  initialStep?: "FileUpload" | "Programs" | "Classes";
  isFirstTime?: boolean;
  transcriptData?: any;
}

// catalog year selector...not sure if we needed a whole file for it ngl
type CatalogChoice = "assigned" | "latest";

interface CatalogYearSelectorProps {
  onNext: (choice: CatalogChoice) => void;
  onBack: () => void;
  transcriptData: any;
}

const CatalogYearSelector: React.FC<CatalogYearSelectorProps> = ({ onNext, onBack, transcriptData }) => {
  const [selected, setSelected] = useState<CatalogChoice>("assigned");
  const assignedYear = calculateCatalogYear(transcriptData?.majors[0].start_date);
  const latestYear = calculateLatestYear();
  
  const details: Record<CatalogChoice, { year: string; label: string; desc: string; tag: string }> = {
    assigned: {
      year: `${assignedYear}-${assignedYear + 1}`,
      label: "Your enrolled catalog",
      desc: "These are the requirements locked in when you enrolled. Your advisor works off this; staying here keeps everything in sync.",
      tag: "Recommended"
    },
    latest: {
      year: `${latestYear}-${latestYear + 1}`,
      label: "Current catalog",
      desc: "The most up-to-date requirements. Some classes may differ from your original plan. Check with your advisor before switching.",
      tag: "May differ from advisor"
    }
  };

  const active = details[selected];

  return (
    <div className="flex flex-col gap-6 py-2">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Catalog year</h2>
        <p className="text-sm text-gray-500 mt-1">Which requirements should we evaluate you against?</p>
      </div>

      {/* Toggle */}
      <div className="flex bg-gray-100 rounded-full p-1 w-fit">
        {["assigned", "latest"].map(opt => (
          <button
            key={opt}
            onClick={() => setSelected(opt as CatalogChoice)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selected === opt
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {opt === "assigned" ? "My catalog" : "Latest"}
          </button>
        ))}
      </div>

      {/* Detail card */}
      <div className="border border-gray-200 rounded-2xl p-5 flex flex-col gap-2 transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{active.year}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            selected === "assigned" ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"
          }`}>
            {active.tag}
          </span>
        </div>
        <p className="font-semibold text-gray-900">{active.label}</p>
        <p className="text-sm text-gray-500 leading-relaxed">{active.desc}</p>
      </div>

      {/* Nav */}
      <div className="flex justify-between items-center pt-1">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 transition">
          Back
        </button>
        <button
          onClick={() => onNext(selected)}
          className="bg-black text-white text-sm px-6 py-2.5 rounded-full hover:bg-gray-800 transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const Onboarding: React.FC<OnboardingProps> = ({ 
  setTranscriptData, 
  onClose, 
  onFinish, 
  initialStep = "FileUpload", 
  isFirstTime,
  transcriptData : initialTranscriptData
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const [modalStep, setModalStep] = useState<"FileUpload" | "Programs" | "CatalogYear" | "Classes">(initialStep);
  const [catalogYear, setCatalogYear] = useState<"assigned" | "latest">("assigned");
  const [transcriptData, setLocalTranscriptData] = useState(initialTranscriptData || null);

  const handleFileUploadNext = (data: any) => {
    setLocalTranscriptData(data);
    setModalStep("Programs");
  };

  const handleManualFill = () => {
    setModalStep("Programs"); 
  };

  const handleCatalogYearNext = (choice: "assigned" | "latest") => {
    setCatalogYear(choice);
    setModalStep("Classes");
  };

  const handleProgramsNext = (updatedPrograms: any[]) => {
    const transformToTranscriptData = (program: any) => ({
      name: program.title,
      program_level: program.level,
      status: program.status,
      school: program.school,
      start_date: program.start_date,
      concentration: program.concentration
    });
    const updatedTranscript = {
      ...transcriptData,
      majors: updatedPrograms.filter(p => p.type === "Major").map(transformToTranscriptData),
      minors: updatedPrograms.filter(p => p.type === "Minor").map(transformToTranscriptData),
      certifications: updatedPrograms.filter(p => p.type === "Certificate").map(transformToTranscriptData)
    };
    setLocalTranscriptData(updatedTranscript);

    if (isFirstTime) {
      setModalStep("Classes");
    } else {
      const assignedYear = calculateCatalogYear(updatedTranscript.majors[0]?.start_date);
      const latestYear = calculateLatestYear();
  
      if (assignedYear === latestYear) {
        // No meaningful choice to offer — skip straight to Classes
        setCatalogYear("assigned");
        setModalStep("Classes");
      } else {
        setModalStep("CatalogYear");
      }
    }
  };

  const handleFinish = (updatedTranscript: any) => {
    const finalData = { ...updatedTranscript, catalogYear };
    setTranscriptData(finalData);
    onFinish(finalData);
  };

  const handleBack = () => {
    if (modalStep === "Programs") setModalStep("FileUpload");
    else if (modalStep === "CatalogYear") setModalStep("Programs");
    else if (modalStep === "Classes") setModalStep(isFirstTime ? "Programs" : "CatalogYear");
  };

  const handleOutsideClick = (e: MouseEvent) => {
    if (!isFirstTime) return;
    if (modalStep == "FileUpload") return;
    const isPortalClick = (e.target as Element).closest?.('[data-radix-popper-content-wrapper]') !== null;
    if (
      modalRef.current &&
      !modalRef.current.contains(e.target as Node) &&
      !(dropdownRef.current && dropdownRef.current.contains(e.target as Node)) &&
      !isPortalClick
    ) {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);



  // Shared white modal card
  const modalCard = (
    <div
      ref={modalRef}
      className="bg-white rounded-[18px] shadow-2xl w-full max-w-3xl relative max-h-[70vh] sm:max-h-[85vh] flex flex-col"
    >
      {!isFirstTime && (
        <button
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition z-10"
          onClick={onClose}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <div className="overflow-y-auto px-4 sm:px-9 py-4 sm:py-7 pb-24 sm:pb-7" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {modalStep === "FileUpload" && (
          <FileUploader
            userId={user?.uid || "test-user-123"}
            onNext={handleFileUploadNext}
            showManualOption={!isFirstTime} 
            onManualFill={handleManualFill}
          />
        )}
        {modalStep === "Programs" && (
          <ProgramValidationA 
            transcriptData={transcriptData} 
            onNext={handleProgramsNext} 
            onBack={handleBack}
            dropdownRef={dropdownRef}
            isFirstTime={isFirstTime}
          />
        )}
        {modalStep === "CatalogYear" && (
          <CatalogYearSelector
            onNext={handleCatalogYearNext}
            onBack={handleBack}
            transcriptData={transcriptData}
          />
        )}
        {modalStep === "Classes" && (
          <ClassValidationA 
            transcriptData={transcriptData} 
            onNext={handleFinish} 
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );

  // When restarting from planner — return just the card, no wrapper.
  // PlannerPage wraps it with bg-black bg-opacity-50, same as delete modals.
  if (!isFirstTime) {
    return modalCard;
  }

  // First time onboarding — full dark screen
  return (
    <>
      <div 
        className="fixed inset-0 z-[60] flex items-center justify-center px-4"
        style={{ background: 'radial-gradient(circle at center, #111111 0%, #181818 100%)' }}
      >
        {modalCard}
        <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 flex gap-2 sm:gap-3 items-center justify-center px-4">
          <SquareAsterisk size={24} className="hidden sm:block stroke-accent flex-shrink-0" />
          <small className="text-gray-300 text-sm text-center">
            This app is in development. For issues or feedback,
            <a
              href="https://docs.google.com/forms/d/1RX5YAecyJPVdbU_czip_rPm9d3w1LCLwwQVg06hG-dQ/edit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline ml-1"
            >
              click here.
            </a>
          </small>
        </div>
      </div>
    </>
  );
};

export default Onboarding;