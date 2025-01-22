import React, { useState } from "react";
import useFileUpload from "../hooks/useFileUpload";

const FileUploader = () => {
  const { selectedFile, isUploading, handleFileChange, uploadFile } =
    // This endpoint is only temporary until we have our own. This is just for testing purposes.
    useFileUpload(
      `https://thingproxy.freeboard.io/fetch/https://postman-echo.com/post`
    );

  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const handleUpload = async () => {
    try {
      const response = await uploadFile();
      if (response && response.success) {
        setFileUrl(response.link); // Store the uploaded file URL
      }
      console.log("Upload success:", response);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  return (
    <div className="p-4 border rounded-md">
      <input type="file" onChange={handleFileChange} className="mb-2" />
      {selectedFile && (
        <p className="text-sm text-gray-600">
          Selected File: {selectedFile.name}
        </p>
      )}
      <button
        onClick={handleUpload}
        className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-700 transition"
        disabled={isUploading || !selectedFile}
      >
        {isUploading ? "Uploading..." : "Upload File"}
      </button>

      {/* Display Download Link */}
      {fileUrl && (
        <div className="mt-4">
          <h2 className="text-lg font-bold">File Uploaded!</h2>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            Download File
          </a>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
