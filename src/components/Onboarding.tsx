import { useRef, useEffect, useState } from "react";
import FileUploader from "./FileUpload";
import { useAuth } from "../context/AuthContext";
import ProgramValidationA from "./ProgramValidationA";
import ClassValidationA from "./ClassValidationA";
import { SquareAsterisk } from "lucide-react";

interface OnboardingProps {
  onClose: () => void;
  onFinish: (data: any) => void;
  setTranscriptData: (data: any) => void;
  initialStep?: "FileUpload" | "Programs" | "Classes";
  isFirstTime?: boolean;
  transcriptData?: any;
}

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

  const [modalStep, setModalStep] = useState<"FileUpload" | "Programs" | "Classes">(initialStep);
  const [transcriptData, setLocalTranscriptData] = useState(initialTranscriptData || null);

  const handleFileUploadNext = (data: any) => {
    setLocalTranscriptData(data);
    setModalStep("Programs");
  };

  const handleManualFill = () => {
    setModalStep("Programs"); 
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
    setModalStep("Classes");
  };

  const handleFinish = (updatedTranscript: any) => {
    setTranscriptData(updatedTranscript);
    onFinish(updatedTranscript);
  };

  const handleBack = () => {
    if (modalStep === "Programs") {
      setModalStep("FileUpload");
    } else if (modalStep === "Classes") {
      setModalStep("Programs");
    }
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