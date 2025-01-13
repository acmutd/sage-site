import React, { useState, useEffect } from "react";
import { auth } from "../firebase-config";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

const LoginPage = () => {
  // State to store email and password input
  signOut(auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Google Sign-In Handler
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      console.log("Signed in with Google:", result.user);

      if (result.user.email === null) {
        result.user
          .delete()
          .then(() => {
            console.log("user deleted");
          })
          .catch((error) => {
            console.error("Error deleting user: ", error);
          });
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Login Error:", error.message);
      } else {
        console.error("An unknown error occurred.");
      }
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

        // Debugging different cases
        switch (firebaseError.code) {
          case "auth/user-not-found":
            console.error(
              "User not found. Please check your email or sign up."
            );
            break;
          case "auth/wrong-password":
            console.error("Incorrect password. Try again.");
            break;
          case "auth/invalid-email":
            console.error("Invalid email format.");
            break;
          default:
            console.error("Unknown error:", firebaseError.message);
        }
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
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error) {
        const firebaseError = error as { code: string; message: string };
        if (firebaseError.code === "auth/email-already-in-use") {
          console.error("This email is already registered. Try signing in.");
        } else if (firebaseError.code === "auth/weak-password") {
          console.error("Password should be at least 6 characters.");
        } else {
          console.error("Sign-Up Error:", firebaseError.message);
        }
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
