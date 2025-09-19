import { useState } from "react";
import Onboarding from "@/components/Onboarding";

const Planner = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  //const [tempScreen, setTempScreen] = useState(false);

  const handleToggleOnboarding = () => {
    setShowOnboarding((prev) => !prev);
  };

  // const submitTranscript = async () => {
  //   if (!user?.uid) {
  //     console.warn("User ID is missing. Cannot fetch conversations.");
  //     return;
  //   }

  //   const token = await user.getIdToken();
  //   if (!token) {
  //     throw new Error("Failed to retrieve authentication token.");
  //   }

  //   const response = await fetch(sumbitTranscriptAPI, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       userId: user?.uid,
  //       // userId: "test-user-123",
  //       action: "getConversations",
  //       token,
  //     }),
  //   });
  // };

  return (
    <div>
      {false ? (
        <div className="flex items-center justify-center mt-[4.2rem] h-[calc(100vh-4.2rem)] bg-innercontainer">
          <div className="relative flex justify-center items-center aspect-[2/1] h-full">
            {/* Blurred Background Image */}
            <img
              src="/PlannerDesign.png"
              alt="Planner Preview"
              className="absolute inset-0 h-[calc(100vh-4.2rem)] object-cover blur-sm z-0"
            />

            {/* Overlay Message */}
            <div className="bg-bglight bg-opacity-40 border border-border px-8 py-6 rounded-2xl shadow-lg text-center z-10">
              <h2>Degree Planner Coming Soon</h2>
              <p>Not available in experimental release</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50 p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">Planner Page</h1>

          <div className="flex justify-center mb-4">
            <button
              onClick={handleToggleOnboarding}
              className="p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              {showOnboarding ? "Hide Onboarding" : "Show Onboarding"}
            </button>
          </div>

          {showOnboarding && (
            <div className="max-w-md mx-auto">
              <Onboarding
                onClose={() => setShowOnboarding(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Planner;
