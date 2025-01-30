import React, { useState } from "react";
import FileUploader from "./FileUpload";

interface OnboardingProps {
  onClose: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onClose }) => {
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedMinor, setSelectedMinor] = useState("");
  const [uploadFile, setUploadFile] = useState(false);

  console.log("Loading Onboarding");

  return (
    <div>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="rounded-md text-black bg-white p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-mermaid">Let's get started!</h1>
            <button
              onClick={onClose}
              className="bg-red-500 text-white px-2 py-2 rounded-md hover:bg-red-600 transition-all"
            >
              ✕
            </button>
          </div>

          <h3 className="text-2xl font-dmsans pt-5">Select your major(s)</h3>

          <select
            className="mt-3 p-2 border rounded-md text-black bg-white"
            value={selectedMajor}
            onChange={(e) => setSelectedMajor(e.target.value)}
          >
            <option value="" disabled>
              Select a major
            </option>
            <option value="computer-science">Computer Science</option>
            <option value="engineering">Engineering</option>
            <option value="business">Business</option>
            <option value="biology">Biology</option>
          </select>

          <h3 className="text-2xl font-dmsans pt-5">
            Select your minor (Optional)
          </h3>
          <select
            className="mt-3 p-2 border rounded-md text-black bg-white"
            value={selectedMinor}
            onChange={(e) => setSelectedMinor(e.target.value)}
          >
            <option value="" disabled>
              Select a minor
            </option>
            <option value="computer-science">Computer Science</option>
            <option value="engineering">Engineering</option>
            <option value="business">Business</option>
            <option value="biology">Biology</option>
          </select>

          {selectedMajor && (
            <>
              <button
                className="bg-[#5AED86] text-black text-base px-4 py-1 rounded-2xl font-semibold hover:bg-green-600 transition duration-300"
                onClick={() => setUploadFile(!uploadFile)}
              >
                Next
              </button>

              {uploadFile && <FileUploader />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
