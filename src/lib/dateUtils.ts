/**
 * Safe Date & Time Formatting Utilities
 * Prevents "RangeError: Invalid time value" on unexpected, unparseable, or Firestore Timestamp inputs
 */

export function parseSafeDate(val: any): Date | null {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return null;
    // If timestamp is in seconds (10 digits), convert to milliseconds
    const ms = val < 10000000000 ? val * 1000 : val;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        const d = val.toDate();
        if (d instanceof Date && !isNaN(d.getTime())) return d;
      } catch {
        // ignore
      }
    }
    if (typeof val.seconds === 'number') {
      const d = new Date(val.seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val._seconds === 'number') {
      const d = new Date(val._seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Numeric timestamp string
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      return parseSafeDate(num);
    }

    // Standard date parsing
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;

    // Try space replacement if YYYY-MM-DD HH:mm:ss
    if (trimmed.includes(' ') && !trimmed.includes('T')) {
      const withT = new Date(trimmed.replace(' ', 'T'));
      if (!isNaN(withT.getTime())) return withT;
    }
  }
  return null;
}

export function safeFormatTime(val: any, fallback = 'Recently', options?: Intl.DateTimeFormatOptions): string {
  const d = parseSafeDate(val);
  if (!d) return typeof val === 'string' && val.trim() ? val : fallback;
  try {
    return d.toLocaleTimeString([], options || { hour: '2-digit', minute: '2-digit' });
  } catch {
    return fallback;
  }
}

export function safeFormatTimeWithSeconds(val: any, fallback = 'Today'): string {
  const d = parseSafeDate(val);
  if (!d) return typeof val === 'string' && val.trim() ? val : fallback;
  try {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return fallback;
  }
}

export function safeFormatDate(val: any, fallback = 'Today', options?: Intl.DateTimeFormatOptions): string {
  const d = parseSafeDate(val);
  if (!d) return typeof val === 'string' && val.trim() ? val : fallback;
  try {
    return d.toLocaleDateString([], options || { month: 'short', day: 'numeric' });
  } catch {
    return fallback;
  }
}

export function safeFormatDateTime(val: any, fallback = 'Recently'): string {
  const d = parseSafeDate(val);
  if (!d) return typeof val === 'string' && val.trim() ? val : fallback;
  try {
    return d.toISOString().replace('T', ' ').substring(0, 16);
  } catch {
    return fallback;
  }
}

export function safeGetTime(val: any, fallback?: number): number {
  const d = parseSafeDate(val);
  const fb = fallback !== undefined ? fallback : Date.now();
  return d ? d.getTime() : fb;
}

export function safeIsoString(val?: any): string {
  const d = parseSafeDate(val) || new Date();
  try {
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}
