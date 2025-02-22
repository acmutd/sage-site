import React, { useState } from "react";
import { auth } from "../firebase-config";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  updateEmail,
  sendPasswordResetEmail,
} from "firebase/auth";
import Cookies from "js-cookie";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State to store email and password input
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const from = location.state?.from || "/chatbot";

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
          return;
        }
      }

      const token = await user.getIdToken();
      Cookies.set("authToken", token, { expires: 7 });
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    }
  };

  // Email/Password Sign-In Handler
  const handleEmailLogin = async () => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("User Info:", result.user);
      navigate(from, { replace: true });
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error) {
        const firebaseError = error as { code: string; message: string };
        console.error("Login Error:", firebaseError.message);
      } else {
        console.error("An unknown error occurred.");
      }
    }
  };

  // Password Reset Handler
  const handlePasswordReset = async () => {
    if (!email) {
      setResetMessage(
        "Please enter your email before resetting your password."
      );
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage("Password reset link sent! Check your email.");
    } catch (error) {
      setResetMessage("Error sending password reset email. Try again.");
      console.error("Password Reset Error:", error);
    }
  };

  return (
    <div className="flex h-screen dark justify-center items-center">
      <div className="flex w-[70rem] h-[70vh] rounded-3xl overflow-hidden">
        <div className="flex-[4] w-auto bg-[#E4E4E4] flex justify-center items-center">
          <img
            src="/login_graphic.svg"
            alt="Login"
            className="w-auto h-auto object-cover"
          />
        </div>
        <div className="flex-[6] w-auto bg-white font-[DMSans]">
          <div className="flex flex-col justify-center h-full w-full mx-auto px-[5rem]">
            <h3 className="text-[24px] font-medium font-bold text-[#1A1A1A] mb-8">
              Welcome back to Sage!
            </h3>

            <form className="w-full space-y-4">
              <div className="space-y-1">
                <label className="block text-[#1A1A1A] text-[15px] mb-1">
                  Name
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter name/email"
                  className="w-full h-[2.5rem] px-4 rounded-full border border-[#E5E5E5] text-[15px] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[#1A1A1A] text-[15px] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password here..."
                  className="w-full h-[2.5rem] px-4 rounded-full border border-[#E5E5E5] text-[15px] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                />
              </div>
              <button
                type="submit"
                onClick={handleEmailLogin}
                className="w-full h-[2.5rem] rounded-full bg-[#4ADE80] hover:bg-[#22c55e] transition-colors text-[15px] font-medium text-[#1A1A1A] mt-4"
              >
                Log in
              </button>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E5E5E5]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-[#6B7280]">or</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full h-[2.5rem] rounded-full border border-[#E5E5E5] hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-[15px] text-[#1A1A1A]"
              >
                <img src="/GoogleIcon.png" alt="Google" className="w-5 h-5" />
                Sign in with Google
              </button>
              <p
                onClick={handlePasswordReset}
                className="text-center text-[15px] text-[#6B7280] mt-6 hover:underline"
              >
                Don't have an account?
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
