import { useState } from "react";
import { toast } from "sonner";
import { NavBrand } from "@sage/ui";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { adminAuth, ADMIN_ACCESS_DENIED_MESSAGE, type AdminAuthAdapter } from "@/auth";

interface LoginPageProps {
  auth?: AdminAuthAdapter;
}

export default function LoginPage({ auth = adminAuth }: LoginPageProps) {
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      const user = await auth.signInWithGoogle();
      // Phase 3 routes to the admin views by tier
      toast.success(`Signed in as ${user.email}`);
    } catch {
      toast.error(ADMIN_ACCESS_DENIED_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-bglight">
      {/* Track art, laid out on the 1440 x 1024 Figma frame and centered vertically like the panel content.
          Shifted 121px left of Figma's x=569 so the line ends stay under the narrowed panel's edge. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-[1024px] -translate-y-1/2 lg:block">
        <img src="/track-art.svg" alt="" className="absolute left-[448px] top-[227px] h-[563px] w-[708px] max-w-none" />
      </div>

      {/* Narrower than Figma's 650px panel: the column is capped at 400px, Google's max sign-in button width */}
      <main className="relative flex min-h-screen w-full flex-col justify-center bg-innercontainer/85 px-6 sm:px-16 lg:w-[529px] lg:border-r lg:border-border">
        <div className="flex w-full max-w-[400px] flex-col gap-10">
          <header>
            <NavBrand isDarkMode={false} homeHref="/login" imgClassName="h-12 w-auto" />
          </header>

          <section className="flex flex-col">
            <h3 className="text-xl leading-none">Sign in to your admin account</h3>
            <div className="mt-5">
              <GoogleSignInButton onClick={handleGoogleSignIn} loading={loading} />
            </div>
            <p className="mt-4 text-sm leading-normal text-textsecondary">
              Sign in with your ACM account (@acmutd.co). Personal Google accounts can't access SAGE Admin.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
