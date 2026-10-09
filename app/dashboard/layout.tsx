'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  Car,
  CalendarRange,
  Banknote,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  Wallet,
  ShieldAlert,
} from 'lucide-react';
import { supabase, getAdmin, AdminProfile } from '@/lib/supabase';
import NotificationDropdown from './components/NotificationDropdown';
import { AdminContext, NavCounts } from './_components/admin-context';
import { Avatar, InlineSpinner } from './_components/ui';
import { DialogHost, Toaster, confirmAction } from './_components/feedback';

type CountKey = keyof NavCounts;

const NAV: { group: string; items: { name: string; href: string; icon: typeof Car; count?: CountKey; urgent?: boolean }[] }[] = [
  { group: '', items: [{ name: 'Overview', href: '/dashboard', icon: LayoutDashboard }] },
  {
    group: 'Operations',
    items: [
      { name: 'Vendors', href: '/dashboard/vendors', icon: Building2, count: 'vendors' },
      { name: 'Cars', href: '/dashboard/cars', icon: Car, count: 'cars' },
      { name: 'Bookings', href: '/dashboard/bookings', icon: CalendarRange },
      { name: 'Disputes', href: '/dashboard/disputes', icon: ShieldAlert, count: 'disputes', urgent: true },
    ],
  },
  {
    group: 'Money',
    items: [
      { name: 'Withdrawals', href: '/dashboard/withdrawals', icon: Wallet, count: 'withdrawals' },
      { name: 'Payments', href: '/dashboard/transactions', icon: Banknote },
    ],
  },
  { group: 'People', items: [{ name: 'Users', href: '/dashboard/users', icon: Users }] },
  {
    group: 'System',
    items: [
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, count: 'notifications' },
      { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));

/** The four most used pages; everything else is under More. */
const PILL_NAV = ['/dashboard', '/dashboard/vendors', '/dashboard/cars', '/dashboard/bookings'].map((href) => ALL_ITEMS.find((i) => i.href === href)!);

const isActive = (href: string, pathname: string) => (href === '/dashboard' ? pathname === href : pathname.startsWith(href));

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [counts, setCounts] = useState<NavCounts>({ vendors: 0, cars: 0, withdrawals: 0, disputes: 0, notifications: 0 });
  const pathname = usePathname();
  const router = useRouter();

  // Every dashboard page requires a signed-in admin.
  useEffect(() => {
    getAdmin().then((a) => {
      if (!a) router.replace('/');
      else setAdmin(a);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/');
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  // Small red/amber numbers in the sidebar for things waiting on an admin.
  const refreshCounts = useCallback(async () => {
    const head = { count: 'exact' as const, head: true };
    const [v, c, w, d, n] = await Promise.all([
      supabase.from('vendors').select('id', head).eq('status', 'pending'),
      supabase.from('cars').select('id', head).eq('approval_status', 'pending'),
      supabase.from('withdrawals').select('id', head).eq('status', 'pending_approval'),
      supabase.from('bookings').select('id', head).eq('status', 'disputed'),
      supabase.from('notifications').select('id', head).eq('read', false),
    ]);
    setCounts({
      vendors: v.count ?? 0,
      cars: c.count ?? 0,
      withdrawals: w.count ?? 0,
      disputes: d.count ?? 0,
      notifications: n.count ?? 0,
    });
  }, []);

  useEffect(() => {
    if (!admin) return;
    refreshCounts();
    const t = setInterval(refreshCounts, 60_000);
    return () => clearInterval(t);
  }, [admin, refreshCounts, pathname]);

  useEffect(() => setSidebarOpen(false), [pathname]);

  const handleLogout = async () => {
    const ok = await confirmAction({ title: 'Log out?', message: 'You will need your email and password to sign back in.', confirmLabel: 'Log out' });
    if (!ok) return;
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (checking || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Escardia" className="h-10 w-10 object-contain" />
          <InlineSpinner className="h-5 w-5 text-brand-600" />
        </div>
      </div>
    );
  }

  const name = [admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.email.split('@')[0];
  const current = ALL_ITEMS.find((i) => isActive(i.href, pathname));
  const moreAlerts = counts.disputes + counts.withdrawals + counts.notifications > 0;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
          <span className="text-[17px] font-semibold tracking-tight text-slate-900">Escardia</span>
          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700">Admin</span>
        </Link>
        <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden" aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {NAV.map((g) => (
          <div key={g.group || 'main'}>
            {g.group && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.group}</p>}
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(item.href, pathname);
                const Icon = item.icon;
                const n = item.count ? counts[item.count] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] ${active ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                    <span className="flex-1">{item.name}</span>
                    {n > 0 && (
                      <span
                        className={`tabular min-w-5 rounded-full px-1.5 py-px text-center text-[11px] font-semibold ${
                          item.urgent ? 'bg-red-500 text-white' : item.count === 'notifications' ? 'bg-brand-600 text-white' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {n}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar text={name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">{admin.email}</p>
          </div>
          <button onClick={handleLogout} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="Log out" aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <AdminContext.Provider value={{ admin, counts, refreshCounts }}>
      <div className="min-h-screen text-slate-900">
        {/* Mobile drawer */}
        {sidebarOpen && <div className="fixed inset-0 z-40 animate-fade-in bg-slate-900/30 backdrop-blur-[2px] lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[260px] transform border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
        >
          {sidebar}
        </aside>

        <div className="lg:pl-[260px]">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-6 w-6 object-contain lg:hidden" />
            <div className="flex min-w-0 items-center gap-2 text-sm">
              {current?.group && <span className="hidden text-slate-400 sm:inline">{current.group}</span>}
              {current?.group && <span className="hidden text-slate-300 sm:inline">/</span>}
              <span className="truncate font-medium text-slate-900">{current?.name ?? 'Escardia'}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-sm text-slate-500 md:inline">
                {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              <span className="hidden h-5 w-px bg-slate-200 md:block" />
              <NotificationDropdown onChange={refreshCounts} />
            </div>
          </header>

          <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-8">{children}</main>
        </div>

        {/* Mobile pill navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
          <div className="flex items-center gap-1 rounded-full bg-white/90 p-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80 backdrop-blur-md">
            {PILL_NAV.map((item) => {
              const active = isActive(item.href, pathname);
              const Icon = item.icon;
              const n = item.count ? counts[item.count] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.name}
                  className={`relative flex h-11 items-center gap-2 rounded-full transition-all duration-300 ${
                    active ? 'bg-brand-600 px-4 text-white shadow-sm' : 'w-11 justify-center text-slate-500 active:bg-slate-100'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {active && <span className="text-sm font-medium">{item.name}</span>}
                  {!active && n > 0 && <span className={`absolute right-2 top-2 h-2 w-2 rounded-full ring-2 ring-white ${item.urgent ? 'bg-red-500' : 'bg-amber-500'}`} />}
                </Link>
              );
            })}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="More"
              className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors active:bg-slate-100 ${
                current && !PILL_NAV.some((p) => p.href === current.href) ? 'bg-brand-50 text-brand-700' : 'text-slate-500'
              }`}
            >
              <Menu className="h-5 w-5" />
              {moreAlerts && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
            </button>
          </div>
        </nav>

        <Toaster />
        <DialogHost />
      </div>
    </AdminContext.Provider>
  );
}
