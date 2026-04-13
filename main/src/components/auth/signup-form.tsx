import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/firebase-config";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";

import { Button } from "@sage/ui";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@sage/ui";
import { Input } from "@sage/ui";
import { Separator } from "@sage/ui";

const VITE_CRUD_API = import.meta.env.VITE_CRUD_API;

const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT as string | undefined;

const isAllowedInDev = (email: string | null): boolean => {
  if (ENVIRONMENT !== 'development') return true;
  return email?.toLowerCase().endsWith('@acmutd.co') || false;
};

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

export default function SignupForm(props: {
  setLoading: (loading: boolean) => void;
}) {
  const navigate = useNavigate();
  const { setAuthChecking } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleGoogleSignup = async () => {
    setAuthChecking(true);
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
        setAuthChecking(false);
        return;
      }

      if (!isAllowedInDev(email)) {
        toast.error("Development access restricted to @acmutd.co emails only.");
        await user.delete();
        setAuthChecking(false);
        return;
      }

      setAuthChecking(false);

      const token = await user.getIdToken();

      props.setLoading(true); // Trigger loading animation for user

      // Google users get profile 0 and their Google profile image
      const profilePictureType = 0;
      const photoUrl = user.photoURL || "";

      await fetch(VITE_CRUD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: result.user.uid,
          token: token,
          action: "createUser",
          profile_picture_type: profilePictureType,
          photo_url: photoUrl,
        }),
      });

      props.setLoading(false); // Unrender loading animation for user
      toast.success("Successfully signed up with Google!");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error during Google sign-up:", error);
      toast.error("Failed to sign up with Google. Please try again.");
      setAuthChecking(false);
      props.setLoading(false); // Unrender loading animation for user
    }
  };

  async function onSubmit(data: FormValues) {
    try {
      props.setLoading(true); // Trigger loading animation for user
      const result = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const token = await result.user.getIdToken();

      // Email users get random profile_picture_type 1-6 and corresponding image URL
      const profilePictureType = Math.floor(Math.random() * 6) + 1;
      const photoUrl = `/assets/profile_pics/${profilePictureType}.png`;

      await fetch(VITE_CRUD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: result.user.uid,
          token: token,
          action: "createUser",
          profile_picture_type: profilePictureType,
          photo_url: photoUrl,
        }),
      });

      props.setLoading(false); // Unrender loading animation for user
      toast.success("Successfully signed up!");
      navigate("/", { replace: true });
    } catch (error: unknown) {
      props.setLoading(false); // Unrender loading animation for user
      if (typeof error === "object" && error !== null && "code" in error) {
        const firebaseError = error as { code: string; message: string };
        toast.error(firebaseError.message);
      } else {
        toast.error("An unknown error occurred.");
      }
    }
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="w-full space-y-4">
            <Form {...form}>
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
                          className="h-[2.5rem] px-4 rounded-full border border-border text-[15px] text-textsecondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-[#10B981]"
                          {...field}
                          disabled={ENVIRONMENT === 'development'}
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
                          className="h-[2.5rem] px-4 rounded-full border border-border text-[15px] text-textsecondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-[#10B981]"
                          {...field}
                          disabled={ENVIRONMENT === 'development'}
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
                      <FormLabel className="text-textdark text-[15px]">
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Confirm password"
                          type="password"
                          className="h-[2.5rem] px-4 rounded-full border border-border text-[15px] text-textsecondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-[#10B981]"
                          {...field}
                          disabled={ENVIRONMENT === 'development'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={ENVIRONMENT === 'development'}
                  className="w-full h-[2.5rem] rounded-full bg-[#4ADE80] hover:bg-[#22c55e] text-[15px] font-medium text-textdark"
                >
                  Sign up
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
                onClick={handleGoogleSignup}
              >
                <img src="/GoogleIcon.png" alt="Google" className="w-5 h-5 mr-2" />
                Sign up with Google
              </Button>

              <a
                href="/login"
                className="text-[15px] text-textsecondary hover:underline"
              >
                Already have an account?
              </a>

              <small className="text-center text-textsecondary mt-4 w-full">
                By signing up, you agree to our{" "}
                <a
                  href="/tos.pdf"
                  target="_blank"
                  className="text-buttonhover hover:underline"
                >
                  Terms of Service
                </a>
                .
              </small>
            </div>
      </div>
    </>
  );
}
