import React, { useState } from "react";
import { auth } from "../firebase-config";
import { Link } from "react-router-dom";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  updateEmail,
} from "firebase/auth";

const LoginPage = () => {
  // State to store email and password input
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Google Sign-In Handler
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("User Info:", user);
      console.log("User Email:", user.email); // email is null
      console.log("User Provider Data:", user.providerData); // providerData has an email is populated properly though, "emw8105@gmail.com"

      const email =
        user.email ||
        user.providerData.find((p) => p.providerId === "google.com")?.email;

      if (!email) {
        console.error("Email is unavailable. Deleting user.");
        await user.delete();
        return;
      }

      console.log("Successfully retrieved email:", email);
      console.log("User Provider Data:", user.providerData);

      if (!user.email && email) {
        try {
          console.log("About to update email");
          await updateEmail(user, email);
          console.log("User email updated:", email);
        } catch (error) {
          console.error("Error: ", error);
          await user.delete();
        }
      }
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    }
  };

  // Email/Password Sign-In Handler
  const handleEmailLogin = async () => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("User Info:", result.user);
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error) {
        const firebaseError = error as { code: string; message: string };
        console.error("Login Error:", firebaseError.message);
      } else {
        console.error("An unknown error occurred.");
      }
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left Side - Image */}
      <div className="w-1/2 flex items-center justify-center bg-[#E4E4E4]">
        <img
          src="/LoginCorpImage.png"
          alt="SAGE LOGIN"
          className="h-auto w-3/4 object-contain"
        />
      </div>

      {/* Right Side - Login Form */}
      <div className="w-1/2 flex flex-col justify-center items-center">
        {/* Left-aligned Heading */}
        <div className="self-start text-2xl font-bold pb-5 pl-20">
          Welcome back to Sage!
        </div>

        {/* Form Container */}
        <div className="w-4/5 flex flex-col items-center">
          <button
            onClick={handleGoogleLogin}
            className="w-full border relative flex items-center justify-center bg-white text-black font-medium py-3 rounded-full hover:bg-gray-200 transition-all duration-300 ease-in-out"
          >
            <img
              src="/GoogleIcon.png"
              alt="Google"
              className="absolute left-4 w-6 h-6"
            />
            <span className="flex-1 text-center">Sign in with Google</span>
          </button>

          <div className="flex items-center w-full mb-6 mt-6">
            <div className="flex-1 border-t border-gray-500"></div>
            <div className="mx-4 text-gray-500">or</div>
            <div className="flex-1 border-t border-gray-500"></div>
          </div>

          {/* Input Fields */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border rounded-full bg-white text-black focus:ring-2 focus:ring-blue-400 focus:outline-none mb-4"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-full bg-white text-black focus:ring-2 focus:ring-blue-400 focus:outline-none mb-6"
          />

          {/* Signup Button */}
          <button
            onClick={handleEmailLogin}
            className="w-full bg-[#5AED86] text-black font-semibold py-3 rounded-full hover:bg-green-500 transition-all duration-300 ease-in-out mb-6"
          >
            Login
          </button>

          <div className="flex justify-center w-full mb-6">
            <Link to="/signup" className="mx-4 text-gray-500 underline">
              Don't have an account yet?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
