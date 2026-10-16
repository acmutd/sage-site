import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  ActiveKeyDate,
  KeyDateRecord,
  chicagoToday,
  computeActive,
  dismiss,
  fetchKeyDatesFromApi,
  loadKeyDates,
  markSeen,
  pickAnnouncement,
  pickBanner,
  pruneState,
} from "@/utils/keyDates";

const CRUD_API = import.meta.env.VITE_CRUD_API as string | undefined;
const DESKTOP_QUERY = "(min-width: 768px)"; // Tailwind `md`

const onboardingActive = () =>
  typeof document !== "undefined" && document.body?.hasAttribute("data-onboarding-active");

function measureTopOffset(): number {
  let bottom = 0;
  document.querySelectorAll("nav").forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.position !== "fixed") return;
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.top <= 24) bottom = Math.max(bottom, r.bottom);
  });
  return Math.round(bottom);
}

function useIsDesktop(): boolean {
  const get = () => typeof window !== "undefined" && window.matchMedia?.(DESKTOP_QUERY).matches === true;
  const [isDesktop, setIsDesktop] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(DESKTOP_QUERY);
    if (!mq) return;
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

/**
 * Mounted once (App.tsx). One surface per screen size:
 *  - mobile:  slim dismissible banner under the navbar (persists until dismissed or the window ends)
 *  - desktop: one-time card in the bottom-right (never repeats once shown)
 * Both disappear on their own when the event's fixed window ends.
 */
export default function KeyDateBanner() {
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const [records, setRecords] = useState<KeyDateRecord[]>([]);
  const [tick, setTick] = useState(0); // bump to re-read dismissed state
  const [announcement, setAnnouncement] = useState<ActiveKeyDate | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const [topOffset, setTopOffset] = useState(0);

  // Load (cached) once the user is signed in.
  useEffect(() => {
    if (!user || !CRUD_API) return;
    let cancelled = false;
    loadKeyDates(() => fetchKeyDatesFromApi(CRUD_API, () => user.getIdToken())).then((r) => {
      if (cancelled) return;
      pruneState(r);
      setRecords(r);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const active = useMemo(() => computeActive(records, chicagoToday()), [records]);

  // Desktop only: one-time card. Wait out onboarding so we never collide with it.
  useEffect(() => {
    if (!isDesktop || !active.length) return;
    const tryShow = () => {
      if (onboardingActive()) return false;
      const next = pickAnnouncement(active);
      if (!next) return true; // nothing to show
      markSeen(next.key); // mark immediately so a reload never repeats it
      setAnnouncement(next);
      return true;
    };
    if (tryShow()) return;
    const id = window.setInterval(() => tryShow() && window.clearInterval(id), 3000);
    return () => window.clearInterval(id);
  }, [isDesktop, active]);

  // Mobile only: banner. `tick` forces re-evaluation after a dismiss.
  const banner = useMemo(() => (isDesktop ? undefined : pickBanner(active)), [isDesktop, active, tick]);

  // Sit directly under whichever fixed navbar this page has (re-measured on route change / resize).
  useLayoutEffect(() => {
    if (!banner) return;
    const update = () => setTopOffset(measureTopOffset());
    update();
    const raf = requestAnimationFrame(update); // navbars may mount a frame after us
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
    };
  }, [banner, pathname]);

  // The banner is fixed under the navbar, so push the page down by its height while it is shown.
  useLayoutEffect(() => {
    if (!banner || !bannerRef.current) return;
    const el = bannerRef.current;
    const body = document.body;
    const base = getComputedStyle(body).paddingTop;
    const apply = () => {
      body.style.paddingTop = `calc(${base} + ${el.offsetHeight}px)`;
    };
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      body.style.paddingTop = "";
    };
  }, [banner]);

  return (
    <>
      {banner && (
        <div
          ref={bannerRef}
          role="status"
          className="fixed left-0 right-0 z-30 flex items-center justify-center gap-2 border-b border-border bg-innercontainer px-3 py-2 text-xs text-textdark"
          style={{ top: topOffset }}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span className="text-center">{banner.shortMessage}</span>
          <button
            type="button"
            aria-label="Dismiss"
            className="ml-1 rounded p-1 hover:bg-black/10"
            onClick={() => {
              dismiss(banner.key);
              setTick((t) => t + 1);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isDesktop && announcement && (
        <div
          role="dialog"
          aria-label={announcement.title}
          className="fixed bottom-4 right-4 z-[80] w-[22rem] rounded-xl border border-border bg-innercontainer p-4 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
            <div className="flex-1">
              <p className="font-semibold text-textdark">{announcement.title}</p>
              <p className="mt-1 text-sm text-textdark/80">{announcement.message}</p>
            </div>
            <button
              type="button"
              aria-label="Close announcement"
              className="rounded p-1 hover:bg-black/10"
              onClick={() => setAnnouncement(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}