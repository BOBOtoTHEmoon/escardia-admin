'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, Quote, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dateTime, fullName, naira, timeAgo } from '@/lib/format';
import { AffixInput, Avatar, Button, Card, DetailList, Empty, Field, PageHeader, Row, Section, Sheet, Spinner, Tabs, inputClass } from '../_components/ui';
import { confirmAction, toast } from '../_components/feedback';
import { useAdmin } from '../_components/admin-context';

/**
 * A customer reported a problem during the trip or within 24 hours after it.
 * The vendor's money stays on hold until an admin decides how to split it.
 */
export default function DisputesPage() {
  const { refreshCounts } = useAdmin();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'open' | 'resolved'>('open');
  const [selected, setSelected] = useState<any | null>(null);
  const [vendorPayout, setVendorPayout] = useState('');
  const [customerRefund, setCustomerRefund] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*, customer:profiles!bookings_customer_id_fkey(first_name, last_name, email, phone), vendor:vendors(business_name, business_phone)')
      .in('status', tab === 'open' ? ['disputed'] : ['resolved'])
      .order(tab === 'open' ? 'disputed_at' : 'released_at', { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const open = (b: any) => {
    setSelected(b);
    setVendorPayout(String(Number(b.vendor_amount)));
    setCustomerRefund('0');
    setNote('');
  };

  // Quick splits
  const preset = (kind: 'vendor' | 'customer' | 'half') => {
    if (!selected) return;
    const share = Number(selected.vendor_amount);
    const total = Number(selected.total);
    if (kind === 'vendor') {
      setVendorPayout(String(share));
      setCustomerRefund('0');
    } else if (kind === 'customer') {
      setVendorPayout('0');
      setCustomerRefund(String(total));
    } else {
      setVendorPayout(String(Math.round(share / 2)));
      setCustomerRefund(String(Math.round(total / 2)));
    }
  };

  const payout = Number(vendorPayout || 0);
  const refund = Number(customerRefund || 0);
  const total = selected ? Number(selected.total) : 0;
  const escardiaKeeps = total - payout - refund;
  const invalid = !!selected && (escardiaKeeps < 0 || payout > Number(selected.vendor_amount) || payout < 0 || refund < 0);

  const resolve = async () => {
    if (!selected) return;
    if (!note.trim()) return toast.error('Add a short note. Both the customer and the vendor will see it.');
    const ok = await confirmAction({
      title: 'Resolve this dispute?',
      message: `The vendor gets ${naira(payout)} and the customer gets ${naira(refund)} back in their wallet. This cannot be undone.`,
      confirmLabel: 'Resolve dispute',
    });
    if (!ok) return;
    setBusy(true);
    const { error } = await supabase.rpc('admin_resolve_dispute', {
      p_booking_id: selected.id,
      p_vendor_payout: payout,
      p_customer_refund: refund,
      p_note: note.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Trip ${selected.code} resolved`);
    setSelected(null);
    load();
    refreshCounts();
  };

  // Share of the bar for the split preview
  const pct = (n: number) => (total > 0 ? `${Math.max(0, Math.min(100, (n / total) * 100))}%` : '0%');

  return (
    <div className="space-y-6">
      <PageHeader title="Disputes" subtitle="Trips where the customer reported a problem. The vendor's payout is paused until you resolve it." />

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'open', label: 'Open' },
          { value: 'resolved', label: 'Resolved' },
        ]}
      />

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty
          icon={tab === 'open' ? ShieldCheck : ShieldAlert}
          text={tab === 'open' ? 'No open disputes' : 'No resolved disputes yet'}
          hint={tab === 'open' ? 'When a customer reports a problem with a trip, it shows up here.' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <button key={b.id} onClick={() => tab === 'open' && open(b)} className={`block w-full text-left ${tab === 'open' ? 'group' : 'cursor-default'}`}>
              <Card className={`p-5 transition-shadow ${tab === 'open' ? 'group-hover:shadow-md' : ''}`}>
                <div className="flex gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tab === 'open' ? 'bg-red-50 text-red-600' : 'bg-violet-50 text-violet-600'}`}>
                    {tab === 'open' ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <p className="font-semibold text-slate-900">
                        {b.car_snapshot?.brand} {b.car_snapshot?.model} <span className="font-mono text-sm font-normal text-slate-500">· {b.code}</span>
                      </p>
                      <p className="tabular text-sm font-semibold text-slate-900">{naira(b.total)}</p>
                    </div>
                    <p className="mt-2 border-l-2 border-slate-200 pl-3 text-sm text-slate-700">{b.dispute_reason}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      <span>{fullName(b.customer?.first_name, b.customer?.last_name)}</span>
                      <span className="text-slate-300">vs</span>
                      <span>{b.vendor?.business_name}</span>
                      <span className="text-slate-300">·</span>
                      <span>reported {timeAgo(b.disputed_at)}</span>
                    </div>
                    {b.resolution_note && <p className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-800">Resolution: {b.resolution_note}</p>}
                  </div>
                  {tab === 'open' && <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" />}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        wide
        title={selected ? `Resolve trip ${selected.code}` : ''}
        subtitle={selected && `${selected.car_snapshot?.brand ?? ''} ${selected.car_snapshot?.model ?? ''} · ${dateTime(selected.start_at)} to ${dateTime(selected.end_at)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button loading={busy} disabled={invalid} onClick={resolve}>
              Resolve dispute
            </Button>
          </>
        }
      >
        {selected && (
          <>
            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-inset ring-red-100">
              <Quote className="h-4 w-4 text-red-400" />
              <p className="mt-2 text-sm text-red-900">{selected.dispute_reason}</p>
              <p className="mt-2 text-xs text-red-700">Reported {dateTime(selected.disputed_at)}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { who: 'Customer', name: fullName(selected.customer?.first_name, selected.customer?.last_name), contact: selected.customer?.phone || selected.customer?.email },
                { who: 'Vendor', name: selected.vendor?.business_name ?? 'Vendor', contact: selected.vendor?.business_phone },
              ].map((p) => (
                <div key={p.who} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <Avatar text={p.name} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{p.who}</p>
                    <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                    <p className="truncate text-xs text-slate-500">{p.contact}</p>
                  </div>
                </div>
              ))}
            </div>

            <Section title="What was paid">
              <DetailList>
                <Row label="Customer paid" value={naira(selected.total)} strong />
                <Row label="Vendor share (most you can pay them)" value={naira(selected.vendor_amount)} />
                <Row label="Escardia commission and fees" value={naira(Number(selected.total) - Number(selected.vendor_amount))} />
              </DetailList>
            </Section>

            <Section title="Decide the split">
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { k: 'vendor' as const, label: 'Vendor was right', sub: 'Pay in full' },
                  { k: 'customer' as const, label: 'Customer was right', sub: 'Full refund' },
                  { k: 'half' as const, label: 'Meet halfway', sub: 'Split 50/50' },
                ].map((p) => (
                  <button
                    key={p.k}
                    onClick={() => preset(p.k)}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50"
                  >
                    <p className="text-sm font-medium text-slate-900">{p.label}</p>
                    <p className="text-xs text-slate-500">{p.sub}</p>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Pay vendor" hint={`Up to ${naira(selected.vendor_amount)}`}>
                  <AffixInput prefix="₦" min={0} value={vendorPayout} onChange={setVendorPayout} />
                </Field>
                <Field label="Refund customer (to wallet)" hint="Payout plus refund cannot be more than the customer paid">
                  <AffixInput prefix="₦" min={0} value={customerRefund} onChange={setCustomerRefund} />
                </Field>
              </div>

              {/* Split preview */}
              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="bg-brand-600" style={{ width: pct(payout) }} />
                  <div className="ml-0.5 bg-emerald-500" style={{ width: pct(refund) }} />
                  <div className="ml-0.5 bg-slate-300" style={{ width: pct(Math.max(0, escardiaKeeps)) }} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="flex items-center gap-1.5 text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-brand-600" />
                      Vendor
                    </p>
                    <p className="tabular mt-0.5 font-semibold text-slate-900">{naira(payout)}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Customer
                    </p>
                    <p className="tabular mt-0.5 font-semibold text-slate-900">{naira(refund)}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                      Escardia keeps
                    </p>
                    <p className={`tabular mt-0.5 font-semibold ${escardiaKeeps < 0 ? 'text-red-600' : 'text-slate-900'}`}>{naira(escardiaKeeps)}</p>
                  </div>
                </div>
                {invalid && (
                  <p className="mt-3 text-xs text-red-600">
                    {payout > Number(selected.vendor_amount) ? "The vendor payout is more than the vendor's share." : 'Payout plus refund is more than the customer paid.'}
                  </p>
                )}
              </div>
            </Section>

            <Field label="Note to both sides" hint="The customer and the vendor both see this.">
              <textarea className={inputClass} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. AC fault confirmed by photos; partial refund agreed." />
            </Field>
          </>
        )}
      </Sheet>
    </div>
  );
}
