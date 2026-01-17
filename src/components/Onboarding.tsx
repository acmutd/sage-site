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
  transcriptData : initialTranscriptData //Rename 
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref for the dropdown
  const { user } = useAuth();

  const [modalStep, setModalStep] = useState<"FileUpload" | "Programs" | "Classes">(initialStep);
  const [transcriptData, setLocalTranscriptData] = useState(initialTranscriptData || null);

  const handleFileUploadNext = (data: any) => {
    setLocalTranscriptData(data);
    setModalStep("Programs");
  };

  const handleFinish = () => {
    setTranscriptData(transcriptData); // Pass data to the parent
    onFinish(transcriptData);
  };

  const handleBack = () => {
    if (modalStep === "Programs") {
      setModalStep("FileUpload");
    } else if (modalStep === "Classes") {
      setModalStep("Programs");
    }
  };
  

  const handleOutsideClick = (e: MouseEvent) => {
    // prevent outside click
    if (modalStep == "FileUpload") return;

    // Check if click is on a Radix Portal element (dropdown menu)
    const isPortalClick = (e.target as Element).closest?.('[data-radix-popper-content-wrapper]') !== null;

    if (
      modalRef.current &&
      !modalRef.current.contains(e.target as Node) && // Check if the click is outside the modal
      !(dropdownRef.current && dropdownRef.current.contains(e.target as Node)) && // Check if the click is inside the dropdown
      !isPortalClick
    ) {
      onClose();
    }
  };

useEffect(() => {
  document.addEventListener("mousedown", handleOutsideClick);
  return () => document.removeEventListener("mousedown", handleOutsideClick);
}, []);

return (
  <>
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{
        background: 'radial-gradient(circle at center, #111111 0%, #181818 100%)'
      }}
    >
      {/* Modal with max height and internal scroll */}
      <div
        ref={modalRef}
        className="bg-white rounded-[18px] shadow-2xl w-full max-w-3xl relative max-h-[85vh] flex flex-col"
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
        {/* Scrollable content area */}
        <div className="overflow-y-auto px-9 py-7" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {modalStep === "FileUpload" && (
            <FileUploader
              userId={user?.uid || "test-user-123"}
              onNext={handleFileUploadNext}
            />
          )}

          {modalStep === "Programs" && (
            <ProgramValidationA 
              transcriptData={transcriptData} 
              onNext={() => setModalStep("Classes")} 
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

      {/* Beta Disclaimer at bottom of page */}
      <div className="absolute bottom-8 left-0 right-0 flex gap-3 items-center justify-center">
        <SquareAsterisk size={24} className="stroke-accent" />
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

