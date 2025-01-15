import React, { useState } from "react";
import { auth } from "../firebase-config";
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

  const handleSignUp = async () => {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("User Signed Up:", result.user);
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      console.log("Sign-in methods for email:", signInMethods);
      console.log("User Provider Data:", result.user.providerData);
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error) {
        const firebaseError = error as { code: string; message: string };
        console.error(firebaseError);
      } else {
        console.error("An unknown error occurred.");
      }
    }
  };

  return (
    <div className="flex items-center justify-between min-h-screen pb-5">
      <div>
        <h1>SAGE Login</h1>
      </div>

      <div>
        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleLogin}
          className="bg-[#5AED86] text-black text-base px-4 py-1 rounded-2xl font-semibold hover:bg-green-600 transition duration-300 mb-5"
        >
          Sign in with Google
        </button>
        <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Or Sign in with Email
          </h2>

          {/* Email/Password Login Form */}
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />

            <button
              onClick={handleEmailLogin}
              className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-300"
            >
              Sign in with Email
            </button>

            <p className="text-gray-500 text-sm">Don't have an account?</p>

            <button
              onClick={handleSignUp}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition duration-300"
            >
              Sign up with Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
