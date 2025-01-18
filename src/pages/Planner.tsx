import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase-config";
import { useNavigate } from "react-router-dom";

const Planner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      console.log("Authenticated User Info:", user);
      console.log("User UID:", user.uid);
      console.log("User Email:", user.email);
      console.log("User Display Name:", user.displayName);
      console.log("User Photo URL:", user.photoURL);
    } else {
      console.log("No user is logged in.");
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User logged out successfully.");
      navigate("/login"); // Redirect to login page after logout
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">Planner Page</h1>

      {user && (
        <div className="mb-4 text-center">
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Name:</strong> {user.displayName || "N/A"}
          </p>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-all"
      >
        Logout
      </button>
    </div>
  );
};

export default Planner;
