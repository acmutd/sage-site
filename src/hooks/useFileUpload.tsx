import { useState } from "react";

const useFileUpload = (uploadUrl: string) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  // Upload file function
  const uploadFile = async (): Promise<any> => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setIsUploading(true);
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        // This headers is only required for now because we are using a proxy server to test the endpoint
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        throw new Error("useFileUpload: Upload failed");
      }

      return await response.json();
    } catch (error) {
      console.error("useFileUpload: Upload error:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { selectedFile, isUploading, handleFileChange, uploadFile };
};

export default useFileUpload;
