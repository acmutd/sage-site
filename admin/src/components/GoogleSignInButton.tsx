import { Button } from "@sage/ui";

interface GoogleSignInButtonProps {
  onClick: () => void;
  loading?: boolean;
}

// Google's "Standard / Outline / Circle" sign-in button; keeps Google's Roboto branding.
// Padding is Figma's 13/10 minus the 2px border, since Figma strokes don't take up layout space.
export default function GoogleSignInButton({ onClick, loading = false }: GoogleSignInButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className="h-auto w-full gap-2 rounded-[20px] border-2 border-google-border bg-white px-[11px] py-2 shadow-none hover:bg-bglight"
    >
      <img src="/GoogleIcon.png" alt="" className="size-5 shrink-0" />
      <span className="flex-1 text-center font-roboto text-[14px] font-medium leading-[17px] tracking-[0.25px] text-google-text">
        {loading ? "Signing in…" : "Sign in with Google"}
      </span>
    </Button>
  );
}
