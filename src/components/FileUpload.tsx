import { useRef, useState, useCallback, useEffect } from "react";
import useFileUpload from "../hooks/useFileUpload";
import { useAuth } from "../context/AuthContext";

interface FileUploaderProps {
  userId: string;
  onNext: (data: any) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ userId, onNext }) => {
  const { selectedFile, isUploading, handleFileChange, uploadFile } =
    useFileUpload(
      import.meta.env.VITE_TRANSCRIPTPARSER_API
    );

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [transcriptData, setTranscriptData] = useState<any>(null);

  const { user } = useAuth();

  const handleUpload = async () => {
    try {
      setErrorMessage(null);
      const token = user ? await user.getIdToken() : null;
      const response = await uploadFile(userId, token);
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

        {!fileUrl && ( // Conditionally render the "Finish" button if no file is uploaded
          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              className="w-auto px-8 p-2 bg-accent text-black rounded-lg hover:bg-blue-700 transition"
              disabled={isUploading || !selectedFile} // Disable if uploading or no file is selected
            >
              {isUploading ? "Uploading..." : "Finish"}
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-4 border border-red-300 bg-red-50 rounded-md">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        {fileUrl && ( // Conditionally render buttons if a file is uploaded
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              className="w-auto px-8 p-2 bg-accent text-black rounded-lg hover:bg-blue-700 transition"
              onClick={() => {
                setFileUrl(null); // Reset the file URL
                setTranscriptData(null); // Reset the transcript data
                setErrorMessage(null); // Reset any error messages
              }}
              style={{ marginRight: '10px' }} // Add spacing to the right of this button
            >
              Re-Upload
            </button>
            <button
              className="w-auto px-8 p-2 bg-accent text-black rounded-lg hover:bg-blue-700 transition"
              onClick={() => onNext(transcriptData)}

            >
              Next
            </button>
          </div>
        )}
      </>
    </div>

  );
};

export default FileUploader;
