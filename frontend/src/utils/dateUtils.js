/**
 * Centralized date utilities with timezone-aware parsing and consistent formatting.
 * All dates display in the user's local timezone (auto-detected via Intl API).
 */

/**
 * Get the user's detected timezone (e.g. "America/New_York")
 */
export function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Parse a date string safely, respecting the user's local timezone.
 * - YYYY-MM-DD strings → local midnight (not UTC)
 * - Full ISO timestamps → browser handles TZ conversion
 * - Already a Date → returned as-is
 */
export function parseDate(d) {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d) ? null : d;

  const s = String(d).trim();

  // Date-only string (YYYY-MM-DD): interpret as local midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(s + 'T00:00:00');
  }

  // Full ISO or other format: let browser parse (handles TZ natively)
  const parsed = new Date(s);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format date as MM/DD/YYYY (US standard)
 * Returns '' for null/invalid dates
 */
export function formatDate(d) {
  const date = parseDate(d);
  if (!date) return '';
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Format date as Mon DD (compact, for timeline/gantt bars)
 * e.g. "Jan 15", "Dec 3"
 */
export function formatDateShort(d) {
  const date = parseDate(d);
  if (!date) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Format date as Mon DD, YYYY (readable, for cards/headers)
 * e.g. "Jan 15, 2025"
 */
export function formatDateMedium(d) {
  const date = parseDate(d);
  if (!date) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Normalize any date value to YYYY-MM-DD string (for date inputs and API)
 * Handles both ISO timestamps and Date objects
 */
export function toDateInputValue(d) {
  const date = parseDate(d);
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Check if two dates fall on the same calendar day (local timezone)
 */
export function isSameDay(a, b) {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da || !db) return false;
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}
