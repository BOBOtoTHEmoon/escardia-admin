'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarRange, MapPin, ShieldCheck, Phone, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { dateTime, fullName, naira, shortDate, timeOnly } from '@/lib/format';
import {
  Avatar,
  Button,
  Callout,
  DetailList,
  Empty,
  Identity,
  PageHeader,
  Row,
  SearchInput,
  Section,
  Sheet,
  Spinner,
  StatusBadge,
  Table,
  Tabs,
  Td,
  Toolbar,
  Tr,
} from '../_components/ui';
import { promptAction, toast } from '../_components/feedback';

type TabValue = 'active' | 'completed' | 'disputed' | 'cancelled' | 'all';

const TAB_STATUSES: Record<TabValue, string[] | null> = {
  active: ['confirmed', 'ongoing'],
  completed: ['completed', 'resolved'],
  disputed: ['disputed'],
  cancelled: ['cancelled'],
  all: null,
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabValue>('active');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*, customer:profiles!bookings_customer_id_fkey(first_name, last_name, email, phone), vendor:vendors(business_name, business_phone)')
      .not('status', 'in', '(expired,pending_payment)')
      .order('created_at', { ascending: false })
      .limit(500);
    setBookings(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const statuses = TAB_STATUSES[tab];
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statuses && !statuses.includes(b.status)) return false;
      if (!q) return true;
      return [b.code, b.car_snapshot?.brand, b.car_snapshot?.model, b.customer?.first_name, b.customer?.last_name, b.customer?.email, b.vendor?.business_name]
        .filter(Boolean)
        .some((s: string) => s.toLowerCase().includes(q));
    });
  }, [bookings, tab, search]);

  const count = (t: TabValue) => (TAB_STATUSES[t] ? bookings.filter((b) => TAB_STATUSES[t]!.includes(b.status)).length : bookings.length);
  const filteredTotal = filtered.reduce((s, b) => s + Number(b.total), 0);

  /** Admin cancel = full refund to the customer's wallet; the vendor gets nothing. */
  const adminCancel = async () => {
    if (!selected) return;
    const reason = await promptAction({
      title: `Cancel trip ${selected.code}?`,
      message: `${naira(selected.total)} goes back to the customer's wallet. The customer and vendor are both notified.`,
      input: { label: 'Reason', placeholder: 'e.g. Vendor could not deliver the car', multiline: true },
      confirmLabel: 'Cancel and refund',
      tone: 'danger',
    });
    if (!reason) return;
    setBusy(true);
    const { error } = await supabase.rpc('cancel_booking', { p_booking_id: selected.id, p_reason: reason });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Trip ${selected.code} cancelled and refunded`);
    setSelected(null);
    load();
  };

  if (loading) return <Spinner />;

  const s = selected;
  const car = s ? `${s.car_snapshot?.brand ?? ''} ${s.car_snapshot?.model ?? ''}`.trim() : '';
  const security = s ? [s.legion_count > 0 && `${s.legion_count} Legion`, s.private_count > 0 && `${s.private_count} Private`, s.hilux_count > 0 && `${s.hilux_count} Hilux`].filter(Boolean).join(', ') : '';

  return (
    <div className="space-y-6">
      <PageHeader title="Bookings" subtitle="Every paid booking on Escardia." />

      <Toolbar>
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'active', label: 'Active', count: count('active') },
            { value: 'completed', label: 'Completed', count: count('completed') },
            { value: 'disputed', label: 'Disputed', count: count('disputed'), alert: true },
            { value: 'cancelled', label: 'Cancelled', count: count('cancelled') },
            { value: 'all', label: 'All', count: count('all') },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search trip ID, car, customer, vendor" />
      </Toolbar>

      {filtered.length === 0 ? (
        <Empty icon={CalendarRange} text={search ? 'No bookings match your search' : 'No bookings here'} />
      ) : (
        <Table
          columns={['Car', 'Customer', 'Vendor', 'When', { label: 'Total', align: 'right' }, 'Status']}
          footer={
            <span className="tabular">
              {filtered.length} booking{filtered.length === 1 ? '' : 's'} · {naira(filteredTotal)}
            </span>
          }
        >
          {filtered.map((b) => (
            <Tr key={b.id} onClick={() => setSelected(b)}>
              <Td>
                <Identity square image={b.car_snapshot?.photo} name={`${b.car_snapshot?.brand ?? ''} ${b.car_snapshot?.model ?? ''}`} sub={<span className="font-mono">{b.code}</span>} />
              </Td>
              <Td className="whitespace-nowrap text-slate-900">{fullName(b.customer?.first_name, b.customer?.last_name)}</Td>
              <Td className="whitespace-nowrap">{b.vendor?.business_name}</Td>
              <Td className="whitespace-nowrap">
                <p className="text-slate-900">
                  {shortDate(b.start_at)} <ArrowRight className="inline h-3 w-3 text-slate-400" /> {shortDate(b.end_at)}
                </p>
                <p className="text-xs text-slate-500">
                  {timeOnly(b.start_at)} · {b.duration} {b.duration_type}
                  {b.duration > 1 ? 's' : ''}
                </p>
              </Td>
              <Td align="right" className="tabular whitespace-nowrap font-medium text-slate-900">
                {naira(b.total)}
              </Td>
              <Td>
                <StatusBadge status={b.status} />
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      <Sheet
        open={!!s}
        onClose={() => setSelected(null)}
        wide
        title={car || 'Booking'}
        subtitle={
          s && (
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{s.code}</span> · <StatusBadge status={s.status} />
            </span>
          )
        }
        footer={
          s?.status === 'confirmed' ? (
            <Button variant="danger" loading={busy} onClick={adminCancel}>
              Cancel with full refund
            </Button>
          ) : undefined
        }
      >
        {s && (
          <>
            {s.status === 'disputed' && (
              <Callout tone="danger" title="This trip is disputed">
                {s.dispute_reason} <Link href="/dashboard/disputes" className="font-medium underline">Resolve it on the Disputes page</Link>
              </Callout>
            )}
            {s.cancel_reason && (
              <Callout tone="warning" title={`Cancelled by ${s.cancelled_by}`}>
                {s.cancel_reason}
              </Callout>
            )}

            {s.car_snapshot?.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.car_snapshot.photo} alt="" className="aspect-[16/7] w-full rounded-xl bg-slate-100 object-cover" />
            )}

            {/* Trip timeline */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Starts</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{dateTime(s.start_at)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Ends</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{dateTime(s.end_at)}</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Section title="Customer">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <Avatar text={fullName(s.customer?.first_name, s.customer?.last_name)} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{fullName(s.customer?.first_name, s.customer?.last_name)}</p>
                    <p className="truncate text-xs text-slate-500">{s.customer?.phone || s.customer?.email}</p>
                  </div>
                </div>
              </Section>
              <Section title="Vendor">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <Avatar text={s.vendor?.business_name ?? 'V'} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{s.vendor?.business_name}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                      <Phone className="h-3 w-3" />
                      {s.vendor?.business_phone}
                    </p>
                  </div>
                </div>
              </Section>
            </div>

            <Section title="Trip details" icon={MapPin}>
              <DetailList>
                <Row label="Duration" value={`${s.duration} ${s.duration_type}${s.duration > 1 ? 's' : ''}`} />
                <Row label="Pickup" value={s.pickup_method === 'delivery' ? `Delivery to ${s.delivery_address}` : `At vendor${s.pickup_location ? `: ${s.pickup_location}` : ''}`} />
                <Row label="Security" value={security ? <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-brand-600" />{security}</span> : 'None'} />
              </DetailList>
            </Section>

            <Section title="Money">
              <DetailList>
                <Row label="Car rental" value={naira(s.base_rental)} />
                {Number(s.delivery_fee) > 0 && <Row label="Delivery" value={naira(s.delivery_fee)} />}
                {Number(s.escort_fee) + Number(s.hilux_fee) > 0 && <Row label="Security and Hilux" value={naira(Number(s.escort_fee) + Number(s.hilux_fee))} />}
                <Row label="Service fee" value={naira(s.service_fee)} />
                <Row label="Customer paid" value={naira(s.total)} strong />
              </DetailList>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-brand-50 p-4">
                  <p className="text-xs text-brand-700">Escardia share</p>
                  <p className="tabular mt-1 text-lg font-semibold text-brand-900">{naira(Number(s.total) - Number(s.vendor_amount))}</p>
                  <p className="text-[11px] text-brand-700">Incl. {(Number(s.commission_rate) * 100).toFixed(0)}% commission</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Vendor share</p>
                  <p className="tabular mt-1 text-lg font-semibold text-slate-900">{naira(s.vendor_amount)}</p>
                  <p className="text-[11px] text-slate-500">
                    {s.released_at
                      ? `Released ${dateTime(s.released_at)}`
                      : s.release_at
                        ? `On hold until ${dateTime(s.release_at)}`
                        : s.status === 'cancelled'
                          ? 'Not paid (cancelled)'
                          : 'On hold until the trip ends'}
                  </p>
                </div>
              </div>
              {Number(s.refund_amount) > 0 && (
                <p className="mt-3 text-sm text-slate-600">
                  Refunded to customer wallet: <span className="tabular font-medium text-slate-900">{naira(s.refund_amount)}</span>
                </p>
              )}
              <p className="mt-3 text-xs text-slate-500">
                Paid with {s.payment_method ?? 'unknown'} · <span className="font-mono">{s.payment_reference}</span>
              </p>
            </Section>
          </>
        )}
      </Sheet>
    </div>
  );
}
