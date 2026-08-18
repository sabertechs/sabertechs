// Backend mirror of src/lib/spreadsheetDateUtils.js — Deno backend functions
// cannot import from src/, so the same logic lives here. Keep both in sync.
//
// Never shifts a date by one day: Excel serials use a UTC epoch + UTC getters;
// string dates are split into components directly (no Date object for
// date-only fields, no toISOString()). Validates impossible dates/times and
// returns a human-readable reason.

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30); // 1899-12-30

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}
function buildDate(y: number, m: number, d: number): string {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}
function buildDateTime(y: number, m: number, d: number, h: number, mi: number, s = 0): string {
  return `${buildDate(y, m, d)}T${pad(h)}:${pad(mi)}:${pad(s)}`;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function validateDateParts(y: number, m: number, d: number): string | null {
  if (!y || y < 1900 || y > 2100) return `invalid year "${y}"`;
  if (m < 1 || m > 12) return `invalid month "${m}"`;
  if (d < 1 || d > daysInMonth(y, m)) return `invalid day "${d}" for ${y}-${pad(m)}`;
  return null;
}

function validateTimeParts(h: number, mi: number, s = 0): string | null {
  if (h < 0 || h > 23) return `invalid hour "${h}"`;
  if (mi < 0 || mi > 59) return `invalid minute "${mi}"`;
  if (s < 0 || s > 59) return `invalid second "${s}"`;
  return null;
}

function parseTimeString(timeStr: string): { h: number; mi: number; s: number } | null {
  if (!timeStr) return null;
  const str = timeStr.trim().toUpperCase();
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

export interface ParseResult {
  ok: boolean;
  value?: string;
  error?: string;
}

/** Parse a spreadsheet cell into a date-only "YYYY-MM-DD" string. */
export function parseSpreadsheetDate(value: unknown): ParseResult {
  if (value == null || value === '') return { ok: false, error: 'empty value' };
  if (value instanceof Date && !isNaN(value.getTime())) {
    return { ok: true, value: buildDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()) };
  }
  const num = Number(value);
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

  let m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const err = validateDateParts(+y, +mo, +d);
    if (err) return { ok: false, error: err };
    return { ok: true, value: buildDate(+y, +mo, +d) };
  }

  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const err = validateDateParts(+m[1], +m[2], +m[3]);
    if (err) return { ok: false, error: err };
    return { ok: true, value: buildDate(+m[1], +m[2], +m[3]) };
  }

  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    return { ok: true, value: buildDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()) };
  }
  return { ok: false, error: `unrecognized date "${str}"` };
}

/** Parse a spreadsheet cell into a canonical date-time "YYYY-MM-DDTHH:mm:ss". */
export function parseSpreadsheetDateTime(value: unknown): ParseResult {
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

  const dateOnly = parseSpreadsheetDate(str);
  if (dateOnly.ok && dateOnly.value) return { ok: true, value: `${dateOnly.value}T00:00:00` };
  return { ok: false, error: `unrecognized date-time "${str}"` };
}