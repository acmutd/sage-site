export type KeyDateType = "enrollment_appt" | "grades_viewable";

export interface KeyDateRecord {
  term: string;
  type: KeyDateType;
  date: string;
  source?: "scraped" | "manual";
}

export interface ActiveKeyDate {
  key: string;
  record: KeyDateRecord;
  title: string;
  message: string;
  shortMessage: string;
  daysLeft: number;
}


export const WINDOWS: Record<KeyDateType, { startOffsetDays: number; durationDays: number }> = {
  enrollment_appt: { startOffsetDays: -7, durationDays: 21 },
  grades_viewable: { startOffsetDays: 0, durationDays: 21 },
};

export const CACHE_KEY = "sage:keydates:cache";
export const DISMISSED_KEY = "sage:keydates:dismissed";
export const SEEN_KEY = "sage:keydates:seen";
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const TZ = "America/Chicago";

/** Today's calendar date in Chicago as yyyy-mm-dd (never UTC). */
export function chicagoToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function termLabel(term: string): string {
  const [season, year] = term.split("-");
  return `${season.charAt(0).toUpperCase()}${season.slice(1)} ${year}`;
}

export const eventKey = (r: KeyDateRecord) => `${r.term}:${r.type}:${r.date}`;

export function computeActive(records: KeyDateRecord[], today: string): ActiveKeyDate[] {
  const out: ActiveKeyDate[] = [];
  for (const r of records) {
    const w = WINDOWS[r.type];
    if (!w || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    const daysUntil = daysBetween(today, r.date);
    const since = -w.startOffsetDays - daysUntil; // days since window opened
    if (since < 0 || since >= w.durationDays) continue;

    const nice = formatDate(r.date);
    const label = termLabel(r.term);
    let title: string;
    let message: string;
    let shortMessage: string;
    if (r.type === "enrollment_appt") {
      const open = daysUntil > 0;
      title = `${label} enrollment appointments`;
      message = open
        ? `Enrollment appointments for ${label} open ${nice}. Check Orion for your time, and get your plan ready in SAGE.`
        : `Enrollment appointments for ${label} are open (since ${nice}). Check Orion for your time and finalize your plan in SAGE.`;
      shortMessage = open
        ? `${label} enrollment appointments open ${formatDateShort(r.date)}.`
        : `${label} enrollment appointments are open.`;
    } else {
      title = `${label} grades are posted`;
      message = `Final grades for ${label} are viewable online (since ${nice}). Upload your updated transcript to refresh your progress and plan your next semester.`;
      shortMessage = `${label} grades are posted. Upload your transcript to plan next semester.`;
    }
    out.push({ key: eventKey(r), record: r, title, message, shortMessage, daysLeft: w.durationDays - since });
  }
  // soonest event date first
  return out.sort((a, b) => a.record.date.localeCompare(b.record.date));
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

export const getDismissed = () => readJSON<string[]>(DISMISSED_KEY, []);
export const getSeen = () => readJSON<string[]>(SEEN_KEY, []);

function addTo(key: string, value: string) {
  const cur = readJSON<string[]>(key, []);
  if (!cur.includes(value)) writeJSON(key, [...cur, value]);
}
export const dismiss = (k: string) => addTo(DISMISSED_KEY, k);
export const markSeen = (k: string) => addTo(SEEN_KEY, k);

/** Drop seen/dismissed keys for events that no longer exist. Only after a non-empty load. */
export function pruneState(records: KeyDateRecord[]) {
  if (!records.length) return;
  const live = new Set(records.map(eventKey));
  writeJSON(DISMISSED_KEY, getDismissed().filter((k) => live.has(k)));
  writeJSON(SEEN_KEY, getSeen().filter((k) => live.has(k)));
}

interface CacheEntry {
  fetchedAt: number;
  records: KeyDateRecord[];
}

/**
 * Cached load. Fresh cache (<6h) is used without any network call; if the fetch
 * fails we fall back to stale cache so the banner still works offline/on errors.
 */
export async function loadKeyDates(
  fetcher: () => Promise<KeyDateRecord[]>,
  nowMs: number = Date.now(),
): Promise<KeyDateRecord[]> {
  const cached = readJSON<CacheEntry | null>(CACHE_KEY, null);
  if (cached && Array.isArray(cached.records) && nowMs - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.records;
  }
  try {
    const records = await fetcher();
    writeJSON(CACHE_KEY, { fetchedAt: nowMs, records } satisfies CacheEntry);
    return records;
  } catch {
    return cached?.records ?? [];
  }
}

export async function fetchKeyDatesFromApi(
  apiBase: string,
  getToken: () => Promise<string | undefined>,
): Promise<KeyDateRecord[]> {
  const token = await getToken();
  if (!token) throw new Error("no token");
  const res = await fetch(`${apiBase}/keydates`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`keydates ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.records) ? data.records : [];
}

/** First active event the user hasn't dismissed (banner), and first unseen one (announcement). */
export function pickBanner(active: ActiveKeyDate[]): ActiveKeyDate | undefined {
  const dismissed = new Set(getDismissed());
  return active.find((a) => !dismissed.has(a.key));
}
export function pickAnnouncement(active: ActiveKeyDate[]): ActiveKeyDate | undefined {
  const seen = new Set(getSeen());
  return active.find((a) => !seen.has(a.key));
}