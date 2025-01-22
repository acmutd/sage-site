import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FileUploader from "../components/FileUpload";

const Onboarding = () => {
  const navigate = useNavigate();
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedMinor, setSelectedMinor] = useState("");
  const [uploadFile, setUploadFile] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black">
      <div className="rounded-md text-black bg-white p-4">
        <h1 className="text-3xl font-mermaid">Let's get started!</h1>

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
  );
};

export default Onboarding;
