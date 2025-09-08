import { useRef, useState, useCallback, useEffect } from "react";
import useFileUpload from "../hooks/useFileUpload";

interface FileUploaderProps {
  userId: string;
  onClose: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ userId, onClose }) => {
  const { selectedFile, isUploading, handleFileChange, uploadFile } =
    useFileUpload(
      "https://tdv6ry29ob.execute-api.us-east-2.amazonaws.com/sage-development/transcriptParser"
    );

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [transcriptData, setTranscriptData] = useState<any>(null);

  const handleUpload = async () => {
    try {
      setErrorMessage(null);
      const response = await uploadFile(userId);
      if (response?.message === "Transcript processed successfully") {
        console.log("Transcript Data:", response.transcript_data);
        setFileUrl("Uploaded"); // Or use a real status/flag — no download link exists in current response
        setTranscriptData(response.transcript_data);
        console.log("response: ", response);
      } else {
        setErrorMessage("Upload failed. Unexpected response format.");
      }

      console.log("Upload success:", response);
    } catch (error) {
      console.error("Upload failed:", error);
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

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div
        ref={modalRef}
        className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold"
        >
          ×
        </button>

        {isDragging && (
          <div className="fixed inset-0 z-50 bg-blue-100 bg-opacity-60 flex items-center justify-center pointer-events-none">
            <div className="text-blue-600 font-bold text-2xl">
              Drop your file anywhere!
            </div>
          </div>
        )}

        <div className="pb-8">
          <h1 className="pb-12">Let's get started!</h1>
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
          className={`mb-4 p-6 border-2 border-dashed rounded-md transition cursor-pointer relative ${
            isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
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

        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            className="w-auto px-8 p-2 bg-accent text-black rounded-lg hover:bg-blue-700 transition"
            disabled={isUploading || !selectedFile}
          >
            {isUploading ? "Uploading..." : "Finish"}
          </button>
        </div>

        {fileUrl && (
          <div className="mt-4 p-4 border border-green-300 bg-green-50 rounded-md">
            <h2 className="text-lg font-bold text-green-700">
              ✅ File Uploaded Successfully!
            </h2>
            <p className="text-sm text-green-800 mb-2">
              File: {selectedFile?.name}
            </p>
            <a
              href={fileUrl}
              download={selectedFile?.name ?? "file"}
              className="text-blue-500 underline"
            >
              Download File
            </a>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-4 border border-red-300 bg-red-50 rounded-md">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        {transcriptData && (
          <div className="mt-4 p-4 border border-blue-300 bg-blue-50 rounded-md">
            <h2 className="text-lg font-bold text-blue-700">
              📄 Transcript Parsed
            </h2>
            {/* <pre className="text-sm text-blue-900 whitespace-pre-wrap">
              {JSON.stringify(transcriptData, null, 2)}
            </pre> */}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
