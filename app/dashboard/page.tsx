'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, Building2, Car, CalendarRange, Wallet, ShieldAlert, Clock, ArrowUpRight, CheckCircle2, TrendingUp, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/lib/supabase';
import { naira, nairaShort, timeAgo, fullName } from '@/lib/format';
import { Avatar, Card, CardHeader, StatCard, StatusBadge, Tabs } from './_components/ui';
import { useAdmin } from './_components/admin-context';

interface Summary {
  grossBookings: number;
  escardiaRevenue: number;
  vendorMoneyOnHold: number;
  walletBalances: number;
  openDisputes: number;
  pendingWithdrawals: number;
}

type Range = '7' | '30' | '90';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function DashboardPage() {
  const { admin } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [counts, setCounts] = useState({ customers: 0, vendors: 0, pendingVendors: 0, cars: 0, pendingCars: 0, activeBookings: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [paid, setPaid] = useState<any[]>([]);
  const [range, setRange] = useState<Range>('30');

  useEffect(() => {
    const load = async () => {
      const head = { count: 'exact' as const, head: true };
      const since = new Date(Date.now() - 90 * 86400000);

      const [s, customers, vendors, pendingVendors, cars, pendingCars, active, recentRes, paidRes] = await Promise.all([
        supabase.rpc('admin_platform_summary'),
        supabase.from('profiles').select('id', head).eq('role', 'customer'),
        supabase.from('vendors').select('id', head),
        supabase.from('vendors').select('id', head).eq('status', 'pending'),
        supabase.from('cars').select('id', head),
        supabase.from('cars').select('id', head).eq('approval_status', 'pending'),
        supabase.from('bookings').select('id', head).in('status', ['confirmed', 'ongoing']),
        supabase
          .from('bookings')
          .select('id, code, status, total, created_at, car_snapshot, customer:profiles!bookings_customer_id_fkey(first_name, last_name)')
          .not('status', 'in', '(expired,pending_payment)')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('bookings')
          .select('paid_at, total, commission_amount, service_fee, escort_fee, hilux_fee, status')
          .gte('paid_at', since.toISOString())
          .not('paid_at', 'is', null),
      ]);

      setSummary(s.data as Summary);
      setCounts({
        customers: customers.count ?? 0,
        vendors: vendors.count ?? 0,
        pendingVendors: pendingVendors.count ?? 0,
        cars: cars.count ?? 0,
        pendingCars: pendingCars.count ?? 0,
        activeBookings: active.count ?? 0,
      });
      setRecent(recentRes.data ?? []);
      setPaid(paidRes.data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  // Escardia revenue per day for the chosen range
  const chart = useMemo(() => {
    const n = Number(range);
    const days: Record<string, { revenue: number; bookings: number }> = {};
    for (let i = n - 1; i >= 0; i--) {
      days[new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)] = { revenue: 0, bookings: 0 };
    }
    paid.forEach((b) => {
      if (b.status === 'cancelled') return;
      const key = (b.paid_at as string).slice(0, 10);
      if (!days[key]) return;
      days[key].bookings += 1;
      days[key].revenue += Number(b.commission_amount) + Number(b.service_fee) + Number(b.escort_fee) + Number(b.hilux_fee);
    });
    return Object.entries(days).map(([k, v]) => ({
      day: new Date(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      ...v,
    }));
  }, [paid, range]);

  const rangeTotal = chart.reduce((s, d) => s + d.revenue, 0);
  const rangeBookings = chart.reduce((s, d) => s + d.bookings, 0);

  if (loading || !summary) return <OverviewSkeleton />;

  const attention = [
    { label: 'Vendors to approve', value: counts.pendingVendors, href: '/dashboard/vendors', icon: Building2 },
    { label: 'Cars to approve', value: counts.pendingCars, href: '/dashboard/cars', icon: Car },
    { label: 'Withdrawals to send', value: summary.pendingWithdrawals, href: '/dashboard/withdrawals', icon: Wallet },
    { label: 'Open disputes', value: summary.openDisputes, href: '/dashboard/disputes', icon: ShieldAlert, urgent: true },
  ];
  const waiting = attention.reduce((s, a) => s + a.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {greeting()}
          {admin?.firstName ? `, ${admin.firstName}` : ''}
        </h1>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}
          {waiting > 0 ? `${waiting} thing${waiting === 1 ? '' : 's'} waiting on you` : 'Nothing waiting on you'}
        </p>
      </div>

      {/* Needs attention */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-900">Needs your attention</h2>
          {waiting === 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> All clear
            </span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 lg:grid-cols-4">
          {attention.map((a) => {
            const Icon = a.icon;
            const hot = a.value > 0;
            return (
              <Link key={a.label} href={a.href} className="group flex items-center gap-3 bg-white px-4 py-4 transition-colors hover:bg-slate-50 sm:px-6">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    hot ? (a.urgent ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600') : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`tabular text-xl font-semibold ${hot ? 'text-slate-900' : 'text-slate-400'}`}>{a.value}</p>
                  <p className="text-xs leading-snug text-slate-500">{a.label}</p>
                </div>
                <ChevronRight className="hidden h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500 sm:block" />
              </Link>
            );
          })}
        </div>
      </Card>

      {/* Money */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-brand-600 p-5 text-white shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 right-6 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between">
            <p className="text-sm font-medium text-brand-100">Escardia revenue</p>
            <TrendingUp className="h-4 w-4 text-brand-200" />
          </div>
          <p className="tabular relative mt-3 text-3xl font-semibold tracking-tight">{naira(summary.escardiaRevenue)}</p>
          <p className="relative mt-1 text-xs text-brand-100">Commission, service and escort fees</p>
        </div>
        <StatCard label="Gross bookings" value={naira(summary.grossBookings)} hint="Total paid by customers" icon={CalendarRange} />
        <StatCard label="Vendor money on hold" value={naira(summary.vendorMoneyOnHold)} hint="Released 24h after trips end" icon={Clock} />
        <StatCard label="Wallet balances" value={naira(summary.walletBalances)} hint="Owed to customers and vendors" icon={Wallet} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Revenue chart */}
        <Card className="xl:col-span-2">
          <div className="flex flex-col gap-4 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div>
              <h2 className="text-sm font-medium text-slate-500">Escardia revenue, last {range} days</h2>
              <p className="tabular mt-1 text-2xl font-semibold tracking-tight text-slate-900">{naira(rangeTotal)}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                From {rangeBookings} paid booking{rangeBookings === 1 ? '' : 's'}
              </p>
            </div>
            <Tabs
              value={range}
              onChange={setRange}
              options={[
                { value: '7', label: '7D' },
                { value: '30', label: '30D' },
                { value: '90', label: '90D' },
              ]}
            />
          </div>
          <div className="h-72 px-2 pb-4 pt-6 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2F5FED" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#2F5FED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#EEF2F7" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  tickLine={false}
                  axisLine={false}
                  interval={range === '7' ? 0 : range === '30' ? 5 : 14}
                  tickMargin={10}
                />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => nairaShort(Number(v))} />
                <Tooltip cursor={{ stroke: '#CBD5E1', strokeWidth: 1 }} content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2F5FED"
                  strokeWidth={2}
                  fill="url(#rev)"
                  activeDot={{ r: 5, fill: '#2F5FED', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent bookings */}
        <Card>
          <CardHeader
            title="Recent bookings"
            action={
              <Link href="/dashboard/bookings" className="flex items-center gap-0.5 text-sm font-medium text-brand-600 hover:text-brand-700">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <div className="mt-2 px-2 pb-3">
            {recent.length === 0 && <p className="px-3 py-8 text-center text-sm text-slate-500">No bookings yet</p>}
            {recent.map((b) => (
              <Link key={b.id} href="/dashboard/bookings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50">
                <Avatar text={b.car_snapshot?.brand ?? 'Car'} image={b.car_snapshot?.photo} square />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {b.car_snapshot?.brand} {b.car_snapshot?.model}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {fullName(b.customer?.first_name, b.customer?.last_name)} · {timeAgo(b.created_at)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="tabular text-sm font-medium text-slate-900">{naira(b.total)}</p>
                  <StatusBadge status={b.status} />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Marketplace */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Customers" value={counts.customers.toLocaleString()} hint="People who can book" icon={Users} />
        <StatCard label="Vendors" value={counts.vendors.toLocaleString()} hint={`${counts.cars} cars listed`} icon={Building2} />
        <StatCard label="Active bookings" value={counts.activeBookings.toLocaleString()} hint="Upcoming or on the road" icon={Car} />
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: { revenue: number; bookings: number } }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl bg-white px-3.5 py-2.5 shadow-lg ring-1 ring-slate-200">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="tabular mt-0.5 text-sm font-semibold text-slate-900">{naira(d.revenue)}</p>
      <p className="text-xs text-slate-500">
        {d.bookings} booking{d.bookings === 1 ? '' : 's'}
      </p>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-64 rounded-lg bg-slate-200/80" />
        <div className="h-4 w-80 rounded bg-slate-200/60" />
      </div>
      <div className="h-36 rounded-2xl bg-white ring-1 ring-slate-200/80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-white ring-1 ring-slate-200/80" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="h-96 rounded-2xl bg-white ring-1 ring-slate-200/80 xl:col-span-2" />
        <div className="h-96 rounded-2xl bg-white ring-1 ring-slate-200/80" />
      </div>
    </div>
  );
}
