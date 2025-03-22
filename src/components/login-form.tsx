import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/firebase-config";
import { useNavigate, useLocation } from "react-router-dom";
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

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/chatbot";

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
      toast.success("Successfully signed in with Google!");
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      toast.error("Failed to sign in with Google. Please try again.");
    }
  };

  const handlePasswordReset = async () => {
    const email = form.getValues("email");
    if (!email) {
      toast.error("Please enter your email before resetting your password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset link sent! Check your email.");
    } catch (error) {
      toast.error("Error sending password reset email. Try again.");
    }
  };

  async function onSubmit(data: FormValues) {
    try {
      const result = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const token = await result.user.getIdToken();
      Cookies.set("authToken", token, { expires: 7 });
      toast.success("Successfully logged in!");
      navigate(from, { replace: true });
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
          <Button
            type="submit"
            className="w-full h-[2.5rem] rounded-full bg-[#4ADE80] hover:bg-[#22c55e] text-[15px] font-medium text-[#1A1A1A]"
          >
            Log in
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
          onClick={handleGoogleLogin}
        >
          <img src="/GoogleIcon.png" alt="Google" className="w-5 h-5 mr-2" />
          Sign in with Google
        </Button>

        <button
          type="button"
          onClick={handlePasswordReset}
          className="text-[15px] text-[#6B7280] hover:underline"
        >
          Forgot password?
        </button>

        <a
          href="/signup"
          className="text-[15px] text-[#6B7280] hover:underline"
        >
          Don't have an account?
        </a>
      </div>
    </div>
  );
}
