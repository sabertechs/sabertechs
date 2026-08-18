// Single source of truth for date parsing, storage, and IST display.
//
// STORAGE CONVENTION
//   - Calendar dates  -> "YYYY-MM-DD"   (timezone-agnostic string, no Date-object conversion)
//   - Timestamps       -> ISO 8601 UTC  "YYYY-MM-DDTHH:mm:ss.sssZ"
//
// DISPLAY CONVENTION
//   - Always Asia/Kolkata (IST, UTC+5:30). Calendar dates are formatted from their
//     components (no Date object, so no timezone shift); timestamps are converted
//     from UTC to IST.

export const IST_TZ = 'Asia/Kolkata';

function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}

function toUTCDateString(y, m, d) {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

/**
 * Parse any flexible input into "YYYY-MM-DD" or null.
 * Handles: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, "2005-Jan-01", Excel-adjacent strings.
 * Extracts components directly — never uses local-timezone Date methods, so the
 * date never shifts by a day regardless of the server/browser timezone.
 */
export function parseFlexibleDate(value) {
  if (value == null) return null;
  if (value instanceof Date && !isNaN(value.getTime())) {
    return toUTCDateString(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  const str = String(value).trim();
  if (!str) return null;

  // DD/MM/YYYY or DD-MM-YYYY (2- or 4-digit year)
  let m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return toUTCDateString(+y, +mo, +d);
  }

  // YYYY-MM-DD (already ISO)
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return toUTCDateString(+m[1], +m[2], +m[3]);

  // Textual month e.g. "2005-Jan-01" — fall back to Date, read UTC components
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    return toUTCDateString(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  return null;
}

/** Validate a stored calendar date string ("YYYY-MM-DD"). */
export function isValidDateString(str) {
  if (!str) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

/** Validate a stored timestamp string (ISO 8601 with time). */
export function isValidISODateTime(str) {
  if (!str) return false;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str);
}

/** Today's calendar date in IST as "YYYY-MM-DD". */
export function todayISTDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/**
 * Format a stored "YYYY-MM-DD" for display (Indian format, IST-safe).
 * Calendar dates have no time component, so they're formatted directly from
 * their parts — the date never shifts regardless of timezone.
 */
export function formatISTDate(dateStr, opts = {}) {
  if (!dateStr) return '';
  const { long = false } = opts;
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'UTC',
      day: '2-digit', month: long ? 'long' : 'short', year: 'numeric',
    }).format(date);
  }
  // Fallback: might be a full timestamp
  return formatISTDateTime(dateStr, opts);
}

/** Format a stored ISO timestamp for display in IST. */
export function formatISTDateTime(isoStr, opts = {}) {
  if (!isoStr) return '';
  const { withTime = true } = opts;
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TZ,
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
  }).format(date);
}