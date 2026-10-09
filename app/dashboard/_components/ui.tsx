'use client';

import { ComponentType, ReactNode, useEffect } from 'react';
import { X, Loader2, Search, Inbox, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { STATUS_LABEL, STATUS_TONE, Tone, initials } from '@/lib/format';

type Icon = ComponentType<{ className?: string }>;

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

const TONE: Record<Tone, { badge: string; dot: string }> = {
  gray: { badge: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400' },
  blue: { badge: 'bg-brand-50 text-brand-700 ring-brand-200', dot: 'bg-brand-600' },
  green: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  amber: { badge: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  red: { badge: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
  violet: { badge: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  orange: { badge: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
};

export const Badge = ({ tone = 'gray', children, dot = true }: { tone?: Tone; children: ReactNode; dot?: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE[tone].badge}`}>
    {dot && <span className={`h-1.5 w-1.5 rounded-full ${TONE[tone].dot}`} />}
    {children}
  </span>
);

export const StatusBadge = ({ status }: { status: string }) => (
  <Badge tone={STATUS_TONE[status] ?? 'gray'}>{STATUS_LABEL[status] ?? status}</Badge>
);

/* ------------------------------------------------------------------ */
/* Page structure                                                      */
/* ------------------------------------------------------------------ */

export const PageHeader = ({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
    </div>
    {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
  </div>
);

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>{children}</div>
);

export const CardHeader = ({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) => (
  <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
    <div className="min-w-0">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {action}
  </div>
);

/** Tabs + search sit in one row above a list. */
export const Toolbar = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">{children}</div>
);

export const SearchInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div className="relative w-full lg:w-80">
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    <input className={`${inputClass} pl-9`} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    {value && (
      <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600" aria-label="Clear search">
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

/** Segmented tabs with counts. */
export const Tabs = <T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number; alert?: boolean }[];
}) => (
  <div className="-mx-1 overflow-x-auto px-1">
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={`tabular rounded-md px-1.5 text-xs ${
                  o.alert && o.count > 0 ? 'bg-amber-100 text-amber-800' : active ? 'bg-slate-100 text-slate-700' : 'text-slate-400'
                }`}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export type Column = string | { label: string; align?: 'left' | 'right'; className?: string };

export const Table = ({ columns, children, footer }: { columns: Column[]; children: ReactNode; footer?: ReactNode }) => (
  <Card className="overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {columns.map((c, i) => {
              const col = typeof c === 'string' ? { label: c } : c;
              return (
                <th
                  key={i}
                  className={`whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.className ?? ''}`}
                >
                  {col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
    {footer && <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-sm text-slate-500">{footer}</div>}
  </Card>
);

export const Tr = ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
  <tr onClick={onClick} className={onClick ? 'group cursor-pointer transition-colors hover:bg-slate-50/80' : ''}>
    {children}
  </tr>
);

export const Td = ({ children, className = '', align }: { children?: ReactNode; className?: string; align?: 'right' }) => (
  <td className={`px-5 py-3.5 align-middle text-slate-700 ${align === 'right' ? 'text-right' : ''} ${className}`}>{children}</td>
);

/** Name with a soft initials circle (or a photo). */
export const Identity = ({ name, sub, image, square = false }: { name: ReactNode; sub?: ReactNode; image?: string | null; square?: boolean }) => (
  <div className="flex min-w-0 items-center gap-3">
    <Avatar text={typeof name === 'string' ? name : ''} image={image} square={square} />
    <div className="min-w-0">
      <p className="truncate font-medium text-slate-900">{name}</p>
      {sub && <p className="truncate text-xs text-slate-500">{sub}</p>}
    </div>
  </div>
);

const AVATAR_TINTS = ['bg-brand-50 text-brand-700', 'bg-slate-100 text-slate-700', 'bg-sky-50 text-sky-700', 'bg-indigo-50 text-indigo-700'];

export const Avatar = ({ text, image, square = false, size = 'md' }: { text: string; image?: string | null; square?: boolean; size?: 'md' | 'lg' }) => {
  const shape = square ? 'rounded-lg' : 'rounded-full';
  const dims = size === 'lg' ? 'h-12 w-12 text-base' : square ? 'h-10 w-14 text-xs' : 'h-9 w-9 text-xs';
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className={`${dims} ${shape} shrink-0 bg-slate-100 object-cover`} />;
  }
  const tint = AVATAR_TINTS[(text.charCodeAt(0) || 0) % AVATAR_TINTS.length];
  return <div className={`${dims} ${shape} ${tint} flex shrink-0 items-center justify-center font-semibold`}>{initials(text)}</div>;
};

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

/** Placeholder while a page loads. */
export const Spinner = () => (
  <div className="animate-pulse space-y-6" aria-label="Loading">
    <div className="space-y-2">
      <div className="h-7 w-48 rounded-lg bg-slate-200/80" />
      <div className="h-4 w-80 max-w-full rounded bg-slate-200/60" />
    </div>
    <div className="h-10 w-full max-w-md rounded-xl bg-slate-200/60" />
    <Card className="divide-y divide-slate-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="h-9 w-9 rounded-full bg-slate-200/70" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 rounded bg-slate-200/70" />
            <div className="h-3 w-1/4 rounded bg-slate-100" />
          </div>
          <div className="h-5 w-20 rounded-full bg-slate-100" />
        </div>
      ))}
    </Card>
  </div>
);

export const InlineSpinner = ({ className = 'h-4 w-4' }: { className?: string }) => <Loader2 className={`${className} animate-spin`} />;

export const Empty = ({ text, hint, icon: IconCmp = Inbox }: { text: string; hint?: string; icon?: Icon }) => (
  <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
      <IconCmp className="h-6 w-6 text-slate-400" />
    </div>
    <p className="mt-4 font-medium text-slate-900">{text}</p>
    {hint && <p className="mt-1 max-w-sm text-sm text-slate-500">{hint}</p>}
  </Card>
);

const CALLOUT = {
  info: { box: 'bg-brand-50 text-brand-900 ring-brand-100', icon: Info, iconColor: 'text-brand-600' },
  warning: { box: 'bg-amber-50 text-amber-900 ring-amber-100', icon: AlertTriangle, iconColor: 'text-amber-600' },
  danger: { box: 'bg-red-50 text-red-900 ring-red-100', icon: XCircle, iconColor: 'text-red-600' },
  success: { box: 'bg-emerald-50 text-emerald-900 ring-emerald-100', icon: CheckCircle2, iconColor: 'text-emerald-600' },
};

export const Callout = ({ tone = 'info', title, children }: { tone?: keyof typeof CALLOUT; title?: string; children?: ReactNode }) => {
  const c = CALLOUT[tone];
  const IconCmp = c.icon;
  return (
    <div className={`flex gap-3 rounded-xl p-3.5 text-sm ring-1 ring-inset ${c.box}`}>
      <IconCmp className={`mt-0.5 h-4 w-4 shrink-0 ${c.iconColor}`} />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Stat tiles                                                          */
/* ------------------------------------------------------------------ */

export const StatCard = ({ label, value, hint, icon: IconCmp }: { label: string; value: ReactNode; hint?: ReactNode; icon?: Icon }) => (
  <Card className="p-5">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {IconCmp && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
          <IconCmp className="h-4 w-4 text-brand-600" />
        </div>
      )}
    </div>
    <p className="tabular mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </Card>
);

/* ------------------------------------------------------------------ */
/* Side panel (details and actions)                                    */
/* ------------------------------------------------------------------ */

export const Sheet = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`absolute inset-y-0 right-0 flex w-full animate-sheet-in flex-col bg-white shadow-2xl sm:m-2 sm:rounded-2xl ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="-mr-2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-6 py-4 sm:rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
};

/** Older pages called it Modal. */
export const Modal = Sheet;

export const Section = ({ title, icon: IconCmp, children, action }: { title: string; icon?: Icon; children: ReactNode; action?: ReactNode }) => (
  <section>
    <div className="mb-2 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {IconCmp && <IconCmp className="h-3.5 w-3.5" />}
        {title}
      </h3>
      {action}
    </div>
    {children}
  </section>
);

/** A bordered list of label / value rows. */
export const DetailList = ({ children }: { children: ReactNode }) => (
  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">{children}</div>
);

export const Row = ({ label, value, strong = false }: { label: string; value: ReactNode; strong?: boolean }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
    <span className="shrink-0 text-slate-500">{label}</span>
    <span className={`min-w-0 break-words text-right ${strong ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>{value ?? '-'}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/* Buttons and forms                                                   */
/* ------------------------------------------------------------------ */

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) => {
  const styles = {
    primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-600/30',
    secondary: 'bg-white text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400/30',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-600/30',
    success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-600/30',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400/30',
  }[variant];
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-3.5 text-sm', lg: 'h-11 px-5 text-sm' }[size];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${sizes} ${className}`}
    >
      {loading && <InlineSpinner />}
      {children}
    </button>
  );
};

export const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
    {children}
    {hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
  </label>
);

export const inputClass =
  'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 transition-shadow focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600';

/** Number input with a ₦ or % marker inside. */
export const AffixInput = ({
  value,
  onChange,
  prefix,
  suffix,
  step,
  min,
}: {
  value: string | number;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
  min?: number;
}) => (
  <div className="relative">
    {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{prefix}</span>}
    <input
      type="number"
      step={step}
      min={min}
      className={`${inputClass} tabular ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-14' : ''}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{suffix}</span>}
  </div>
);
