import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  getAdditionalUserInfo,
} from "firebase/auth";
import { auth } from "@/firebase-config";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Toaster, toast } from "sonner";

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

const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT as string | undefined;
const isEmailAllowedInDev = (email: string | null): boolean => {
  if (ENVIRONMENT !== 'development') return true;
  return email?.toLowerCase().endsWith('@acmutd.co') || false;
};

const isUserAllowedInDev = async (user: any, resolvedEmail?: string): Promise<boolean> => {
  if (ENVIRONMENT !== 'development') return true;
  const emailToCheck = resolvedEmail || user.email;
  if (emailToCheck?.toLowerCase().endsWith('@acmutd.co')) return true;
  try {
      const tokenResult = await user.getIdTokenResult();
      return tokenResult.claims?.alumniACMDev === true;
  } catch {
      return false;
  }
};
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginForm(props: { isMobile: boolean, setLoading: (loading: boolean) => void}) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";
  const [loginError, setLoginError] = useState(false);
  const { setAuthChecking } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleGoogleLogin = async () => {
    setAuthChecking(true);
    
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const isNewUser = getAdditionalUserInfo(result)?.isNewUser ?? false;
      const email =
        user.email ||
        user.providerData.find((p) => p.providerId === "google.com")?.email;

        if (!email) {
          toast.error("Email is unavailable. Please try again.");
          if (isNewUser) await user.delete();
          else await auth.signOut();
          setAuthChecking(false);
          return;
        }
        
        if (!await isUserAllowedInDev(user, email)) {
          toast.error("Development access restricted to @acmutd.co emails only or via special permision.");
          if (isNewUser) await user.delete();
          else await auth.signOut();
          setAuthChecking(false);
          return;
        }

      setAuthChecking(false);
      const token = await user.getIdToken();

      props.setLoading(true); // Trigger loading animation for user
      
      // Google users get profile 0 and their Google profile image
      const profilePictureType = 0;
      const photoUrl = user.photoURL || "";

      if (isNewUser) {
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
      } 
      
      toast.success("Successfully signed in with Google!");
      navigate(from, { replace: true });
      props.setLoading(false); // Unrender loading animation for user
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      toast.error("Failed to sign in with Google. Please try again.");
      setAuthChecking(false);
      props.setLoading(false); // Unrender loading animation for user
    }
  };

  async function onSubmit(data: FormValues) {
    if (!isEmailAllowedInDev(data.email)) {
      toast.error("Development access restricted to @acmutd.co emails only.");
      return;
    }

    try {
      props.setLoading(true); // Trigger loading animation for user
      const result = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const token = await result.user.getIdToken();

      // 1. Try to get the user profile
      const profileRes = await fetch(VITE_CRUD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: result.user.uid,
          action: "getProfile",
          token: token,
        }),
      });

      const profileData = profileRes.ok ? await profileRes.json() : {};

      // 2. If photoUrl is missing, make a POST to createUser
      if (!profileData.photo_url) {
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
      }

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
    <>
      <Toaster position="top-center" richColors closeButton />
      <div>
            {
              props.isMobile ? <div className="w-full space-y-6 pb-4">
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
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
                            {...field}
                            placeholder="Enter password"
                            type="password"
                            className="h-[2.5rem] px-4 rounded-full border border-border text-[15px] placeholder:text-textsecondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"                          
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
              :
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
            }
      </div>
    </>
    
  );
}
