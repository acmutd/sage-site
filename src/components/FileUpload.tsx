import { useRef, useState, useCallback, useEffect } from "react";
import useFileUpload from "../hooks/useFileUpload";
import { useAuth } from "../context/AuthContext";

interface FileUploaderProps {
  userId: string;
  onNext: (data: any) => void;
  showManualOption?: boolean;
  onManualFill?: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onNext, showManualOption = false, onManualFill }) => {
  const { selectedFile, isUploading, handleFileChange, uploadFile } =
    useFileUpload(
      import.meta.env.VITE_TRANSCRIPTPARSER_API
    );

  const [fileUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
        localStorage.removeItem('evaluation');
        localStorage.removeItem('transcriptData');
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

  return (

    <div>
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-blue-100 bg-opacity-60 flex items-center justify-center pointer-events-none">
          <div className="text-blue-600 font-bold text-2xl">
            Drop your file anywhere!
          </div>
        </div>
      )}
      <>
        <div className="pb-6">
          <h1 className="pb-9">Let's get started!</h1>
          <h3>Upload your unofficial transcript</h3>
          <small className="text-gray-500 ">
            This will allow us to automatically fill in your past classes,
            majors, and current schedule. The file is likely named SSR_TSRPT.pdf
          </small>
        </div>

        <div
          onClick={handleClick}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`mb-4 p-6 border-2 border-dashed rounded-md transition cursor-pointer relative ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
            }`}
        >
          <div className="p-8">
            <img
              src="/FileUploadIcon.png"
              alt="File Upload"
              className="h-16 w-16 mx-auto m-5"
            />
            <p className="text-center text-gray-500">
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
          <p className="text-sm text-gray-600 mb-2">
            Selected File: {selectedFile.name}
          </p>
        )}

        {!fileUrl && (
          <div className="flex justify-between items-center mt-4">
            {showManualOption && onManualFill ? (
              <button
                onClick={onManualFill}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Or click here to fill manually
              </button>
            ) : (
              <div></div>
            )}
            
            <button
              onClick={handleUpload}
              className="w-auto px-8 p-2 bg-accent text-black rounded-lg hover:bg-blue-700 transition"
              disabled={isUploading || !selectedFile}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-4 border border-red-300 bg-red-50 rounded-md">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}
      </>
    </div>

  );
};

export default FileUploader;
