import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';

const inr = (digits: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: digits });

export const formatINR = (amount: number | null | undefined) => {
  const n = amount ?? 0;
  return inr(n % 1 !== 0 ? 2 : 0).format(n);
};

/** ₹12.4k */
export const formatINRShort = (amount: number) =>
  amount >= 100000
    ? `₹${Math.round(amount / 10000) / 10}L`
    : amount >= 1000
      ? `₹${Math.round(amount / 100) / 10}k`
      : `₹${Math.round(amount)}`;

export const formatDate = (iso: string | null | undefined, pattern = 'EEE, d MMM yyyy') =>
  iso ? format(parseISO(iso), pattern) : '—';

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? format(new Date(iso), 'd MMM yyyy, h:mm a') : '—';

export function formatTime(t: string | null | undefined) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const hh = h % 24;
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
}

export const formatTimeRange = (a: string, b: string) => `${formatTime(a)} – ${formatTime(b)}`;

export function dayLabel(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE, d MMM');
}

export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd');

export const humanize = (value: string | null | undefined) =>
  value
    ? value
        .toLowerCase()
        .split('_')
        .map((w) => (w === 'upi' ? 'UPI' : w[0].toUpperCase() + w.slice(1)))
        .join(' ')
    : '—';

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
