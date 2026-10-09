export const naira = (n: number | string | null | undefined) =>
  `₦${Number(n ?? 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

/** ₦1.2M, ₦45k: for chart axes and tight spaces. */
export const nairaShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `₦${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `₦${Math.round(n / 1_000)}k`;
  return `₦${n}`;
};

export const dateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';

export const dateOnly = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

export const timeOnly = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }) : '';

export const timeAgo = (iso: string | null | undefined) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return dateOnly(iso);
};

export const fullName = (first?: string | null, last?: string | null) => [first, last].filter(Boolean).join(' ') || 'Unknown';

export const initials = (text?: string | null) =>
  (text || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

/** Human labels for database statuses. */
export const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Upcoming',
  ongoing: 'Ongoing',
  completed: 'Completed',
  disputed: 'Disputed',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
  expired: 'Expired',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
  pending_approval: 'Needs approval',
  processing: 'Processing',
  success: 'Paid out',
  failed: 'Failed',
  abandoned: 'Abandoned',
  available: 'Available',
  maintenance: 'Maintenance',
  booked: 'Booked',
};

export type Tone = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'orange';

/** Colour family for each status. Badges always show the label too, never colour alone. */
export const STATUS_TONE: Record<string, Tone> = {
  pending_payment: 'gray',
  confirmed: 'blue',
  ongoing: 'green',
  completed: 'gray',
  disputed: 'red',
  resolved: 'violet',
  cancelled: 'gray',
  expired: 'gray',
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  suspended: 'orange',
  pending_approval: 'amber',
  processing: 'blue',
  success: 'green',
  failed: 'red',
  abandoned: 'gray',
  available: 'green',
  maintenance: 'orange',
  booked: 'blue',
};
