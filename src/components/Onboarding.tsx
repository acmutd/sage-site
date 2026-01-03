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
}

const Onboarding: React.FC<OnboardingProps> = ({ setTranscriptData, onClose, onFinish, initialStep = "FileUpload" }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref for the dropdown
  const { user } = useAuth();

  const [modalStep, setModalStep] = useState<"FileUpload" | "Programs" | "Classes">(initialStep);
  const [transcriptData, setLocalTranscriptData] = useState(null);

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

    if (
      modalRef.current &&
      !modalRef.current.contains(e.target as Node) && // Check if the click is outside the modal
      !(dropdownRef.current && dropdownRef.current.contains(e.target as Node)) // Check if the click is inside the dropdown
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

