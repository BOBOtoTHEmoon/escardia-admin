'use client';

import { useEffect, useMemo, useState } from 'react';
import { Banknote, CreditCard, Landmark, Smartphone, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dateTime, fullName, naira } from '@/lib/format';
import { Badge, Empty, Identity, PageHeader, SearchInput, Spinner, StatCard, Table, Tabs, Td, Toolbar, Tr } from '../_components/ui';
import type { Tone } from '@/lib/format';

const PAY_BADGE: Record<string, { tone: Tone; label: string }> = {
  success: { tone: 'green', label: 'Paid' },
  pending: { tone: 'amber', label: 'Pending' },
  failed: { tone: 'red', label: 'Failed' },
  abandoned: { tone: 'gray', label: 'Abandoned' },
};

type TabValue = 'success' | 'pending' | 'failed' | 'all';

const OUTCOME: Record<string, string> = {
  booking_confirmed: 'Booking confirmed',
  booking_confirmed_late: 'Confirmed (paid late)',
  wallet_credited: 'Wallet topped up',
  underpaid_credited_to_wallet: 'Underpaid, sent to wallet',
  car_taken_credited_to_wallet: 'Car taken, sent to wallet',
  booking_closed_credited_to_wallet: 'Booking closed, sent to wallet',
};

const CHANNEL_ICON: Record<string, typeof CreditCard> = { card: CreditCard, bank: Landmark, bank_transfer: Landmark, ussd: Smartphone, mobile_money: Smartphone };

/** Every Paystack payment, matched to Paystack by its reference. */
export default function PaymentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabValue>('success');
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('payments')
      .select('reference, purpose, amount, amount_paid, status, channel, outcome, paid_at, created_at, user:profiles(first_name, last_name, email), booking:bookings(code)')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, []);

  const isFailed = (p: any) => p.status === 'failed' || p.status === 'abandoned';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (tab === 'failed' && !isFailed(p)) return false;
      if (tab !== 'all' && tab !== 'failed' && p.status !== tab) return false;
      if (!q) return true;
      return [p.reference, p.user?.email, p.user?.first_name, p.user?.last_name, p.booking?.code].filter(Boolean).some((s: string) => s.toLowerCase().includes(q));
    });
  }, [rows, tab, search]);

  const ok = rows.filter((p) => p.status === 'success');
  const received = ok.reduce((sum, p) => sum + Number(p.amount_paid ?? p.amount), 0);
  const forBookings = ok.filter((p) => p.purpose === 'booking').reduce((sum, p) => sum + Number(p.amount_paid ?? p.amount), 0);
  const filteredTotal = filtered.reduce((sum, p) => sum + Number(p.amount_paid ?? p.amount), 0);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle="Money customers paid into Escardia through Paystack. Search a reference to match it in Paystack." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Received" value={naira(received)} hint={`${ok.length} successful payment${ok.length === 1 ? '' : 's'}`} icon={Banknote} />
        <StatCard label="For bookings" value={naira(forBookings)} hint="Paid at checkout" icon={CreditCard} />
        <StatCard label="Wallet top ups" value={naira(received - forBookings)} hint="Added to customer wallets" icon={Wallet} />
      </div>

      <Toolbar>
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'success', label: 'Successful', count: ok.length },
            { value: 'pending', label: 'Pending', count: rows.filter((p) => p.status === 'pending').length },
            { value: 'failed', label: 'Failed', count: rows.filter(isFailed).length },
            { value: 'all', label: 'All', count: rows.length },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search reference, customer, trip" />
      </Toolbar>

      {filtered.length === 0 ? (
        <Empty icon={Banknote} text={search ? 'No payments match your search' : 'No payments here'} />
      ) : (
        <Table
          columns={['Customer', 'For', 'Method', { label: 'Amount', align: 'right' }, 'Status', 'Date', 'Reference']}
          footer={
            <span className="tabular">
              {filtered.length} payment{filtered.length === 1 ? '' : 's'} · {naira(filteredTotal)}
            </span>
          }
        >
          {filtered.map((p) => {
            const ChannelIcon = CHANNEL_ICON[p.channel] ?? CreditCard;
            return (
              <Tr key={p.reference}>
                <Td>
                  <Identity name={fullName(p.user?.first_name, p.user?.last_name)} sub={p.user?.email} />
                </Td>
                <Td className="whitespace-nowrap">
                  <p className="text-slate-900">{p.purpose === 'booking' ? `Trip ${p.booking?.code ?? ''}` : 'Wallet top up'}</p>
                  {p.outcome && <p className="text-xs text-slate-500">{OUTCOME[p.outcome] ?? p.outcome}</p>}
                </Td>
                <Td className="whitespace-nowrap">
                  {p.channel ? (
                    <span className="inline-flex items-center gap-1.5 capitalize">
                      <ChannelIcon className="h-3.5 w-3.5 text-slate-400" />
                      {p.channel.replace('_', ' ')}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </Td>
                <Td align="right" className="tabular whitespace-nowrap font-medium text-slate-900">
                  {naira(p.amount_paid ?? p.amount)}
                </Td>
                <Td>
                  <Badge tone={PAY_BADGE[p.status]?.tone ?? 'gray'}>{PAY_BADGE[p.status]?.label ?? p.status}</Badge>
                </Td>
                <Td className="whitespace-nowrap text-xs text-slate-500">{dateTime(p.paid_at ?? p.created_at)}</Td>
                <Td className="font-mono text-xs text-slate-500">{p.reference}</Td>
              </Tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
