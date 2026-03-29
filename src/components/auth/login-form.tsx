import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/firebase-config";
import { useNavigate, useLocation, Link } from "react-router-dom";
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

const VITE_CRUD_API = import.meta.env.VITE_CRUD_API;

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginForm(props: { setLoading: (loading: boolean) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/chatbot";
  const [loginError, setLoginError] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleGoogleLogin = async () => {
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

      props.setLoading(true); // Trigger loading animation for user

      await fetch(VITE_CRUD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: result.user.uid,
          token: token,
          action: "createUser",
        }),
      });

      toast.success("Successfully signed in with Google!");
      navigate(from, { replace: true });
      props.setLoading(false); // Unrender loading animation for user
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      toast.error("Failed to sign in with Google. Please try again.");
      props.setLoading(false); // Unrender loading animation for user
    }
  };

  async function onSubmit(data: FormValues) {
    try {
      props.setLoading(true); // Trigger loading animation for user
      const result = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const token = await result.user.getIdToken();
      Cookies.set("authToken", token, { expires: 7 });
      toast.success("Successfully logged in!");
      props.setLoading(false); // Unrender loading animation for user
      navigate(from, { replace: true });
    } catch (error: unknown) {
      props.setLoading(false); // Unrender loading animation for user
      if (typeof error === "object" && error !== null && "code" in error) {
        const firebaseError = error as { code: string; message: string };
        toast.error(firebaseError.message);
      } else {
        toast.error("An unknown error occurred.");
      }
      setLoginError(true);
    }
  }

  return (
    <div className="w-full space-y-6 pb-4">
      <Form {...form}>
        {loginError && (
          <small className="text-destructive">
            Login failed. Please verify your credentials or{" "}
            <Link to="/signup" className="underline font-bold">
              sign up
            </Link>{" "}
            if you don’t have an account.
          </small>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-textdark text-[15px]">
                  Email
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter email"
                    type="email"
                    className="h-[2.5rem] px-4 rounded-full border border-border text-[15px] placeholder:text-textsecondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    {...field}
                    onChange={(e) => {
                      setLoginError(false);
                      field.onChange(e);
                    }}
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
                <FormLabel className="text-textdark text-[15px]">
                  Password
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter password"
                    type="password"
                    className="h-[2.5rem] px-4 rounded-full border border-border text-[15px] placeholder:text-textsecondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    {...field}
                    onChange={(e) => {
                      setLoginError(false);
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full h-[2.5rem] rounded-full bg-accent hover:bg-buttonhover text-[15px] text-textdark"
          >
            Log in
          </Button>
        </form>
      </Form>

      <div className="flex gap-2 justify-center items-center w-full">
        <Separator className="flex-[1] border-border" />
        <small className="bg-white text-xs text-textsecondary">OR</small>
        <Separator className="flex-[1] border-border" />
      </div>

      <div className="flex flex-col items-center space-y-3">
        <Button
          variant="outline"
          className="w-full h-[2.5rem] bg-light rounded-full border border-border hover:bg-gray-50 text-[15px] text-black hover:text-black"
          onClick={handleGoogleLogin}
        >
          <img src="/GoogleIcon.png" alt="Google" className="w-5 h-5 mr-2" />
          Sign in with Google
        </Button>

        <Link
          to="/forgot-password"
          className="text-[15px] text-textsecondary hover:underline"
        >
          Forgot password?
        </Link>

        <Link
          to="/signup"
          className="text-[15px] text-textsecondary hover:underline"
        >
          Don't have an account?
        </Link>
      </div>
    </div>
  );
}
