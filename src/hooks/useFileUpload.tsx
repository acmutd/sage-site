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
  const uploadFile = async (userId: string): Promise<any> => {
    if (!selectedFile) return;
    // Read file as base64
    const toBase64 = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          // Remove the data URL prefix
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = (error) => reject(error);
      });

    try {
      setIsUploading(true);
      const base64_pdf = await toBase64(selectedFile);

      const payload = {
        id: userId,
        pdf_content: base64_pdf,
      };

      console.log(
        "Sending payload to backend:",
        JSON.stringify(payload, null, 2)
      );

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Received response:", await response.clone().json());

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
