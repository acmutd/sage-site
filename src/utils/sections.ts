/**
 * Coursebook section fields normally arrive as strings, but some sources send
 * arrays (instructors, days, times, location). Calling string methods such as
 * `.replace` or `.split` directly on those values throws, so anything that
 * renders a section field should go through these helpers.
 */

/** The first value of a field that may be a string, an array, or missing. */
export const firstOf = (value: unknown): string => {
    if (Array.isArray(value)) return value.length > 0 ? String(value[0] ?? "") : "";
    return value == null ? "" : String(value);
};

/** First meeting time of a field like "10:00 AM - 11:15 AM; 2:00 PM - 3:00 PM". */
export const firstTime = (value: unknown): string => firstOf(value).split(";")[0].trim();
