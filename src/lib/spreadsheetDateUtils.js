// Single source of truth for parsing date and date-time cells from Excel/CSV.
//
// RULES
//   - Never shifts a date by one day. Excel serials use a UTC epoch + UTC
//     getters; string dates are split into components directly (no Date object
//     for date-only fields, no toISOString()).
//   - Validates impossible dates/times (month 1-12, day valid for month,
//     hour 0-23, minute/second 0-59) and returns a human-readable reason.
//   - Returns { ok: true, value } | { ok: false, error } so every importer can
//     report the row, column, and reason for each rejected value.
//
// SUPPORTED INPUTS
//   - Excel serial dates (numeric, days since 1899-12-30)
//   - Real JS Date values (from XLSX cellDates:true)
//   - YYYY-MM-DD
//   - DD-MM-YYYY, DD/MM/YYYY (2- or 4-digit year)
//   - DD-MMM-YY, DD/MMM/YYYY, DD MMM YYYY (e.g. "01-Apr-26")
//   - Common date-time strings with optional AM/PM and Excel time fractions

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30); // 1899-12-30

function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}
function buildDate(y, m, d) {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}
function buildDateTime(y, m, d, h, mi, s = 0) {
  return `${buildDate(y, m, d)}T${pad(h)}:${pad(mi)}:${pad(s)}`;
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function daysInMonth(y, m) {
  // m is 1-12; new Date(y, m, 0) returns the last day of month m
  return new Date(y, m, 0).getDate();
}

function validateDateParts(y, m, d) {
  if (!y || y < 1900 || y > 2100) return `invalid year "${y}"`;
  if (m < 1 || m > 12) return `invalid month "${m}"`;
  if (d < 1 || d > daysInMonth(y, m)) return `invalid day "${d}" for ${y}-${pad(m)}`;
  return null;
}

function validateTimeParts(h, mi, s = 0) {
  if (h < 0 || h > 23) return `invalid hour "${h}"`;
  if (mi < 0 || mi > 59) return `invalid minute "${mi}"`;
  if (s < 0 || s > 59) return `invalid second "${s}"`;
  return null;
}

// Parse a time fragment: "14:30", "2:30 PM", "14:30:00", "2:30:00 PM"
function parseTimeString(timeStr) {
  if (!timeStr) return null;
  const str = String(timeStr).trim().toUpperCase();
  if (!str) return null;
  let isPM = false, isAM = false;
  let core = str;
  const ampm = str.match(/\s*(AM|PM)\s*$/);
  if (ampm) {
    isPM = ampm[1] === 'PM';
    isAM = ampm[1] === 'AM';
    core = str.slice(0, ampm.index).trim();
  }
  const parts = core.split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  const h = parseInt(parts[0], 10);
  const mi = parseInt(parts[1], 10);
  const s = parts.length === 3 ? parseInt(parts[2], 10) : 0;
  if (isNaN(h) || isNaN(mi) || isNaN(s)) return null;
  let hh = h;
  if (isPM && hh < 12) hh += 12;
  if (isAM && hh === 12) hh = 0;
  return { h: hh, mi, s };
}

/**
 * Parse a spreadsheet cell into a date-only "YYYY-MM-DD" string.
 * @returns {{ ok: true, value: string } | { ok: false, error: string }}
 */
export function parseSpreadsheetDate(value) {
  if (value == null || value === '') return { ok: false, error: 'empty value' };
  if (value instanceof Date && !isNaN(value.getTime())) {
    return { ok: true, value: buildDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()) };
  }
  const num = Number(value);
  // Excel serial date — days since 1899-12-30 (>1000 avoids confusing with a year)
  if (!isNaN(num) && num > 1000 && String(value).trim() !== '') {
    const wholeDays = Math.floor(num);
    const ms = EXCEL_EPOCH_MS + wholeDays * 86400000;
    const d = new Date(ms);
    const err = validateDateParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    if (err) return { ok: false, error: err };
    return { ok: true, value: buildDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) };
  }
  const str = String(value).trim();
  if (!str) return { ok: false, error: 'empty value' };

  // DD-MMM-YY / DD/MMM/YYYY / DD MMM YY  e.g. "01-Apr-26", "01/Apr/2026"
  const dMonY = str.match(/^(\d{1,2})[-\/\s]([A-Za-z]{3,9})[-\/\s](\d{2,4})$/);
  if (dMonY) {
    let [, d, mon, y] = dMonY;
    const m = MONTHS[mon.toLowerCase().slice(0, 3)];
    if (!m) return { ok: false, error: `unknown month "${mon}"` };
    if (y.length === 2) y = '20' + y;
    const err = validateDateParts(+y, m, +d);
    if (err) return { ok: false, error: err };
    return { ok: true, value: buildDate(+y, m, +d) };
  }

  // DD-MM-YYYY or DD/MM/YYYY (2- or 4-digit year)
  let m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const err = validateDateParts(+y, +mo, +d);
    if (err) return { ok: false, error: err };
    return { ok: true, value: buildDate(+y, +mo, +d) };
  }

  // YYYY-MM-DD
  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const err = validateDateParts(+m[1], +m[2], +m[3]);
    if (err) return { ok: false, error: err };
    return { ok: true, value: buildDate(+m[1], +m[2], +m[3]) };
  }

  // Fallback: Date parse for unusual but valid strings (e.g. "March 5, 2026")
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    return { ok: true, value: buildDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()) };
  }
  return { ok: false, error: `unrecognized date "${str}"` };
}

/**
 * Parse a spreadsheet cell into a canonical date-time "YYYY-MM-DDTHH:mm:ss".
 * Handles Excel serials with time fractions, "date time" strings, and AM/PM.
 * @returns {{ ok: true, value: string } | { ok: false, error: string }}
 */
export function parseSpreadsheetDateTime(value) {
  if (value == null || value === '') return { ok: false, error: 'empty value' };
  if (value instanceof Date && !isNaN(value.getTime())) {
    return {
      ok: true,
      value: buildDateTime(
        value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate(),
        value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds()
      ),
    };
  }
  const num = Number(value);
  if (!isNaN(num) && num > 1000 && String(value).trim() !== '') {
    const wholeDays = Math.floor(num);
    const dayMs = EXCEL_EPOCH_MS + wholeDays * 86400000;
    const fracMs = Math.round((num - wholeDays) * 86400000);
    const d = new Date(dayMs + fracMs);
    const err = validateDateParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
      || validateTimeParts(d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
    if (err) return { ok: false, error: err };
    return {
      ok: true,
      value: buildDateTime(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()),
    };
  }
  const str = String(value).trim();
  if (!str) return { ok: false, error: 'empty value' };

  // "date time" — split on whitespace
  const sep = str.match(/^(\S+)\s+(\S+.*)$/);
  if (sep) {
    const dateRes = parseSpreadsheetDate(sep[1]);
    const timeObj = parseTimeString(sep[2]);
    if (dateRes.ok && timeObj) {
      const err = validateTimeParts(timeObj.h, timeObj.mi, timeObj.s);
      if (err) return { ok: false, error: err };
      return { ok: true, value: `${dateRes.value}T${pad(timeObj.h)}:${pad(timeObj.mi)}:${pad(timeObj.s)}` };
    }
  }

  // Date only — treat as midnight
  const dateOnly = parseSpreadsheetDate(str);
  if (dateOnly.ok) return { ok: true, value: `${dateOnly.value}T00:00:00` };
  return { ok: false, error: `unrecognized date-time "${str}"` };
}