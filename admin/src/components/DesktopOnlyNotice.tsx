import { useCallback, useState, useSyncExternalStore } from "react";
import { Monitor } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@sage/ui";

// Below the lg breakpoint the admin layout isn't designed for; width, not device, is what breaks it
const NARROW_VIEWPORT_QUERY = "(max-width: 1023px)";
const DISMISSED_KEY = "sage-admin:desktop-notice-dismissed";

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    window.sessionStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Storage blocked: the notice just comes back on the next load
  }
}

function useIsNarrowViewport(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const query = window.matchMedia(NARROW_VIEWPORT_QUERY);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return useSyncExternalStore(subscribe, () => window.matchMedia(NARROW_VIEWPORT_QUERY).matches);
}

// Dismissible rather than blocking: admin has no mobile layout, but nobody gets locked out.
// The shared Dialog's bg-background / muted / rounded-lg tokens don't exist in admin's preset, hence the overrides.
export default function DesktopOnlyNotice() {
  const isNarrow = useIsNarrowViewport();
  const [dismissed, setDismissed] = useState(readDismissed);

  function dismiss() {
    rememberDismissed();
    setDismissed(true);
  }

  return (
    <Dialog open={isNarrow && !dismissed} onOpenChange={(open) => !open && dismiss()}>
      <DialogContent className="w-[calc(100%-32px)] rounded-md border-border bg-bglight sm:rounded-md">
        <DialogHeader className="items-center text-center sm:text-center">
          <Monitor aria-hidden className="mb-2 size-10 text-textsecondary" />
          <DialogTitle className="text-xl font-semibold">Best viewed on a desktop</DialogTitle>
          <DialogDescription className="text-sm text-textsecondary">
            SAGE Admin is designed for larger screens, so some pages may not display correctly here. For the best
            experience, open it on a desktop or laptop.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            onClick={dismiss}
            className="rounded-[27px] bg-accent px-[30px] text-base text-textdark shadow-none hover:bg-buttonhover focus-visible:ring-textdark"
          >
            Continue anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
