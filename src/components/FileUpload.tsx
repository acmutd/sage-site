import { useRef, useState, useCallback, useEffect } from "react";
import useFileUpload from "../hooks/useFileUpload";
import { useAuth } from "../context/AuthContext";

interface FileUploaderProps {
  userId: string;
  onNext: (data: any) => void;
  showManualOption?: boolean;
  onManualFill?: () => void;
}

const transcriptSteps = [
  "Log into UTD Galaxy",
  "Go to dropdown and select UTD Student Center",
  "Click on My Academics and then press View My Transcript",
  "For Report Type, select Unofficial Transcript and press submit. Note: it may take a while",
  "Download the PDF once opened on a separate tab (usually named SSR_TSRPT.pdf)"
];

const FileUploader: React.FC<FileUploaderProps> = ({ onNext, showManualOption = false, onManualFill }) => {
  const { selectedFile, isUploading, handleFileChange, uploadFile } =
    useFileUpload(
      import.meta.env.VITE_TRANSCRIPTPARSER_API
    );

  const [fileUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { user } = useAuth();

  const handleUpload = async () => {
    try {
      setErrorMessage(null);

      if (!user?.uid) {
        setErrorMessage("User not authenticated");
        return;
      }

      const token = user ? await user.getIdToken() : null;
      const response = await uploadFile(user.uid, token);
      if (response?.message === "Transcript processed successfully") {
        onNext(response.transcript_data); 
      } else {
        setErrorMessage("Upload failed. Unexpected response format.");
      }
    } catch (error) {
      setErrorMessage("Upload failed. Please try again.");
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        const syntheticEvent = {
          target: { files: [file] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileChange(syntheticEvent);
      }
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [handleFileChange]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) {
        const syntheticEvent = {
          target: { files: [file] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileChange(syntheticEvent);
      }
      if (inputRef.current) inputRef.current.value = "";
    };

    const handleWindowDragLeave = () => {
      setIsDragging(false);
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);
    window.addEventListener("dragleave", handleWindowDragLeave);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
      window.removeEventListener("dragleave", handleWindowDragLeave);
    };
  }, [handleFileChange]);

  const handleMouseLeave = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setShowTooltip(false);
      setIsAnimatingOut(false);
    }, 150);
  };

  return (
    <div className="px-4 sm:px-0">
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-blue-100 bg-opacity-60 flex items-center justify-center pointer-events-none">
          <div className="text-blue-600 font-bold text-xl sm:text-2xl">
            Drop your file anywhere!
          </div>
        </div>
      )}
      <>
        <div className="pb-4 sm:pb-6">
          <h1 className="text-4xl sm:text-5xl pb-6 sm:pb-9">Let's get started!</h1>
          <h3 className="text-xl sm:text-2xl">Upload your unofficial transcript</h3>
          <small className="text-gray-500 block mb-2 text-xs sm:text-sm">
            This will allow us to automatically fill in your past classes,
            majors, and current schedule. The file is likely named SSR_TSRPT.pdf
          </small>
          
          <div className="relative inline-block">
            <span
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 underline cursor-help"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={handleMouseLeave}
            >
              Need help finding your unofficial transcript?
            </span>

            {showTooltip && (
              <div 
                className="absolute left-0 top-full mt-2 z-50 w-[90vw] sm:w-96 max-w-md bg-white rounded-md shadow-lg border border-gray-200 p-3 sm:p-4"
                style={{
                  animation: isAnimatingOut ? 'zoomOut 0.15s ease-in' : 'zoomIn 0.15s ease-out'
                }}
              >
                <div className="absolute -top-2 left-8 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                <p className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">
                  How to get your transcript:
                </p>
                
                <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-700">
                  {transcriptSteps.map((step, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="flex-shrink-0">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div
          onClick={handleClick}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`mb-4 p-4 sm:p-6 border-2 border-dashed rounded-md transition cursor-pointer relative ${
            isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
          }`}
        >
          <div className="p-4 sm:p-8">
          <img
            src="/FileUploadIcon.png"
            alt="File Upload"
            className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-5"
          />
            <p className="text-center text-gray-500 text-sm sm:text-base">
              Click <span className="underline">here</span> to upload files or
              drag and drop
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {selectedFile && (
          <p className="text-xs sm:text-sm text-gray-600 mb-2">
            Selected File: {selectedFile.name}
          </p>
        )}

        {!fileUrl && (
          <div className="flex justify-between items-center mt-4">
            {showManualOption && onManualFill ? (
              <button
                onClick={onManualFill}
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Or click here to fill manually
              </button>
            ) : (
              <div></div>
            )}
            
            <button
              onClick={handleUpload}
              className="w-auto px-6 sm:px-8 py-1.5 sm:py-2 text-sm sm:text-base bg-accent text-black rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isUploading || !selectedFile}
            >
              {isUploading ? (
                <span>
                  Uploading<span className="loading-ellipsis"></span>
                </span>
              ) : (
                "Upload"
              )}
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 sm:p-4 border border-red-300 bg-red-50 rounded-md">
            <p className="text-xs sm:text-sm text-red-800">{errorMessage}</p>
          </div>
        )}
      </>
    </div>
  );
};

export default FileUploader;