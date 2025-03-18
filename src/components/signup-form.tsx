"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/firebase-config";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const formSchema = z
  .object({
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

export default function SignupForm() {
  const navigate = useNavigate();
  const [resetMessage, setResetMessage] = useState("");

  const VITE_CRUD_API = import.meta.env.VITE_CRUD_API;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleGoogleSignup = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const email =
        user.email ||
        user.providerData.find((p) => p.providerId === "google.com")?.email;

      if (!email) {
        toast.error("Email is unavailable. Please try again.");
        await user.delete();
        return;
      }

      const token = await user.getIdToken();
      Cookies.set("authToken", token, { expires: 7 });

      await fetch(VITE_CRUD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: result.user.uid,
          token: token,
          action: "createUser",
        }),
      });

      toast.success("Successfully signed up with Google!");
      navigate("/chatbot", { replace: true });
    } catch (error) {
      console.error("Error during Google sign-up:", error);
      toast.error("Failed to sign up with Google. Please try again.");
    }
  };

  async function onSubmit(data: FormValues) {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const token = await result.user.getIdToken();
      Cookies.set("authToken", token, { expires: 7 });
      await fetch(VITE_CRUD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: result.user.uid,
          token: token,
          action: "createUser",
        }),
      });

      toast.success("Successfully signed up!");
      navigate("/chatbot", { replace: true });
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error) {
        const firebaseError = error as { code: string; message: string };
        toast.error(firebaseError.message);
      } else {
        toast.error("An unknown error occurred.");
      }
    }
  }

  return (
    <div className="w-full space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#1A1A1A] text-[15px]">
                  Email
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter email"
                    type="email"
                    className="h-[2.5rem] px-4 rounded-full border border-[#E5E5E5] text-[15px] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#1A1A1A] text-[15px]">
                  Password
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter password"
                    type="password"
                    className="h-[2.5rem] px-4 rounded-full border border-[#E5E5E5] text-[15px] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#1A1A1A] text-[15px]">
                  Confirm Password
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Confirm password"
                    type="password"
                    className="h-[2.5rem] px-4 rounded-full border border-[#E5E5E5] text-[15px] placeholder:text-[#6B7280] focus:outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full h-[2.5rem] rounded-full bg-[#4ADE80] hover:bg-[#22c55e] text-[15px] font-medium text-[#1A1A1A]"
          >
            Sign up
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full border-[#E5E5E5]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-[#6B7280]">or</span>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-3">
        <Button
          variant="outline"
          className="w-full h-[2.5rem] bg-light rounded-full border border-[#E5E5E5] hover:bg-gray-50 text-[15px] text-black hover:text-black"
          onClick={handleGoogleSignup}
        >
          <img src="/GoogleIcon.png" alt="Google" className="w-5 h-5 mr-2" />
          Sign up with Google
        </Button>

        <a href="/login" className="text-[15px] text-[#6B7280] hover:underline">
          Already have an account?
        </a>
      </div>

      <p className="text-center text-[14px] text-[#6B7280] mt-4">
        By signing up, you agree to our{" "}
        <a
          href="/public/tos.pdf"
          target="_blank"
          className="text-[#10B981] hover:underline"
        >
          Terms of Service
        </a>
        .
      </p>
    </div>
  );
}
