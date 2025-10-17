import { useRef, useEffect, useState } from "react";
import FileUploader from "./FileUpload";
import { useAuth } from "../context/AuthContext";
import ProgramValidationA from "./ProgramValidationA";
import ClassValidationA from "./ClassValidationA";

interface OnboardingProps {
  onClose: () => void;
  onFinish: () => void;

}

const Onboarding: React.FC<OnboardingProps> = ({ onClose, onFinish }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const [modalStep, setModalStep] = useState<"FileUpload" | "Programs" | "Classes">("FileUpload");
  const [transcriptData, setTranscriptData] = useState(null);

  const handleFileUploadNext = (data: any) => {
    setTranscriptData(data);
    setModalStep("Programs");
  };


  const handleOutsideClick = (e: MouseEvent) => {
    if (
      modalRef.current &&
      !modalRef.current.contains(e.target as Node) &&
      !(e.target as HTMLElement).closest(".dropdown-container") // Ensure dropdown clicks are ignored
    ) {
      onClose();
    }
  };
  
  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div
        ref={modalRef}
        className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl relative"
      >
        {modalStep === "FileUpload" && (
          <FileUploader
            userId={user?.uid || "test-user-123"}
            onNext={handleFileUploadNext}
            
          />
        )}

        {modalStep === "Programs" && (
          <ProgramValidationA transcriptData={transcriptData} onNext={() => setModalStep("Classes")} />
        )}
        {modalStep === "Classes" && (
          <ClassValidationA transcriptData={transcriptData} onNext={onFinish} />
        )}
      </div>
    </div>
  );
};

export default Onboarding;

