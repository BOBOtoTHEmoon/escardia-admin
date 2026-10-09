'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Landmark, Wallet, XCircle } from 'lucide-react';
import { supabase, callFunction } from '@/lib/supabase';
import { dateTime, naira, timeAgo } from '@/lib/format';
import {
  Button,
  Callout,
  DetailList,
  Empty,
  Field,
  Identity,
  PageHeader,
  Row,
  Section,
  Sheet,
  Spinner,
  StatusBadge,
  Table,
  Tabs,
  Td,
  Tr,
  inputClass,
} from '../_components/ui';
import { confirmAction, toast } from '../_components/feedback';
import { useAdmin } from '../_components/admin-context';

type TabValue = 'pending_approval' | 'processing' | 'success' | 'failed' | 'all';

/**
 * Vendors request payouts from their available balance (the money is set aside straight away).
 * Approve sends a Paystack transfer. Reject puts the money back in the vendor's wallet.
 */
export default function WithdrawalsPage() {
  const { refreshCounts } = useAdmin();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabValue>('pending_approval');
  const [selected, setSelected] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('withdrawals').select('*, vendor:vendors(business_name, business_phone)').order('created_at', { ascending: false }).limit(300);
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((w) => {
    if (tab === 'all') return true;
    if (tab === 'processing') return w.status === 'processing' || w.status === 'approved';
    if (tab === 'failed') return w.status === 'failed' || w.status === 'rejected';
    return w.status === tab;
  });

  const process = async (approve: boolean) => {
    if (!selected) return;
    if (!approve && !reason.trim()) return toast.error('Add a reason first. The vendor will see it.');
    if (approve) {
      const ok = await confirmAction({
        title: `Send ${naira(selected.net_amount)}?`,
        message: `Paystack will transfer the money to ${selected.account_name}, ${selected.bank_name} ${selected.account_number}.`,
        confirmLabel: 'Send money',
        tone: 'success',
      });
      if (!ok) return;
    }
    setBusy(approve ? 'approve' : 'reject');
    setMessage('');
    try {
      const r = await callFunction<{ status: string; message?: string }>('process-withdrawal', {
        withdrawalId: selected.id,
        approve,
        reason: approve ? undefined : reason.trim(),
      });
      if (r.status === 'otp') {
        setMessage(r.message ?? 'Paystack wants an OTP for this transfer.');
      } else {
        toast.success(approve ? `Transfer to ${selected.vendor?.business_name} started` : 'Withdrawal rejected. The money is back in the vendor wallet.');
        setSelected(null);
      }
      load();
      refreshCounts();
    } catch (e) {
      toast.error((e as Error).message);
      load();
    } finally {
      setBusy(null);
    }
  };

  const filteredTotal = filtered.reduce((sum, w) => sum + Number(w.amount), 0);
  const pending = rows.filter((w) => w.status === 'pending_approval');
  const pendingTotal = pending.reduce((sum, w) => sum + Number(w.net_amount), 0);
  const paidTotal = rows.filter((w) => w.status === 'success').reduce((sum, w) => sum + Number(w.net_amount), 0);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Withdrawals" subtitle="Vendors asking to be paid. Approving sends the money with Paystack." />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-5">
          <p className="text-sm font-medium text-amber-800">Waiting for you</p>
          <p className="tabular mt-2 text-2xl font-semibold text-slate-900">{naira(pendingTotal)}</p>
          <p className="mt-1 text-xs text-amber-800">
            {pending.length} request{pending.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Paid out so far</p>
          <p className="tabular mt-2 text-2xl font-semibold text-slate-900">{naira(paidTotal)}</p>
          <p className="mt-1 text-xs text-slate-500">Sent to vendor bank accounts</p>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pending_approval', label: 'Needs approval', count: pending.length, alert: true },
          { value: 'processing', label: 'Processing' },
          { value: 'success', label: 'Paid out' },
          { value: 'failed', label: 'Failed or rejected' },
          { value: 'all', label: 'All' },
        ]}
      />

      {filtered.length === 0 ? (
        <Empty icon={Wallet} text={tab === 'pending_approval' ? 'No withdrawals waiting' : 'Nothing here'} hint={tab === 'pending_approval' ? 'When a vendor asks to be paid, it shows up here.' : undefined} />
      ) : (
        <Table
          columns={['Vendor', { label: 'Amount', align: 'right' }, { label: 'They receive', align: 'right' }, 'Bank account', 'Requested', 'Status', '']}
          footer={
            <span className="tabular">
              {filtered.length} withdrawal{filtered.length === 1 ? '' : 's'} · {naira(filteredTotal)}
            </span>
          }
        >
          {filtered.map((w) => (
            <Tr
              key={w.id}
              onClick={() => {
                setSelected(w);
                setReason('');
                setMessage('');
              }}
            >
              <Td>
                <Identity name={w.vendor?.business_name ?? 'Vendor'} sub={w.vendor?.business_phone} />
              </Td>
              <Td align="right" className="tabular whitespace-nowrap font-medium text-slate-900">
                {naira(w.amount)}
              </Td>
              <Td align="right" className="tabular whitespace-nowrap">
                {naira(w.net_amount)}
              </Td>
              <Td className="whitespace-nowrap">
                <p className="text-slate-900">{w.account_name}</p>
                <p className="text-xs text-slate-500">
                  {w.bank_name} · {w.account_number}
                </p>
              </Td>
              <Td className="whitespace-nowrap text-slate-500">{timeAgo(w.created_at)}</Td>
              <Td>
                <StatusBadge status={w.status} />
              </Td>
              <Td align="right">
                {w.status === 'pending_approval' && (
                  <Button size="sm" variant="secondary">
                    Review
                  </Button>
                )}
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.vendor?.business_name ?? 'Withdrawal'}
        subtitle={selected && <span className="flex items-center gap-2">Requested {dateTime(selected.created_at)} · <StatusBadge status={selected.status} /></span>}
        footer={
          selected?.status === 'pending_approval' ? (
            <>
              <Button variant="secondary" className="text-red-600" loading={busy === 'reject'} disabled={!!busy} onClick={() => process(false)}>
                <XCircle className="h-4 w-4" /> Reject
              </Button>
              <Button variant="success" loading={busy === 'approve'} disabled={!!busy} onClick={() => process(true)}>
                {busy !== 'approve' && <CheckCircle2 className="h-4 w-4" />} Approve and send
              </Button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <>
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <p className="text-sm text-slate-400">They receive</p>
              <p className="tabular mt-1 text-3xl font-semibold tracking-tight">{naira(selected.net_amount)}</p>
              <p className="mt-1 text-xs text-slate-400">
                {naira(selected.amount)} requested, less {naira(selected.fee)} transfer fee
              </p>
              <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/10 p-3">
                <Landmark className="h-5 w-5 text-slate-300" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selected.account_name}</p>
                  <p className="truncate text-xs text-slate-400">
                    {selected.bank_name} · {selected.account_number}
                  </p>
                </div>
              </div>
            </div>

            {message && <Callout tone="warning">{message}</Callout>}
            {selected.failure_reason && (
              <Callout tone="danger" title={selected.status === 'rejected' ? 'Rejected' : 'Failed'}>
                {selected.failure_reason}
              </Callout>
            )}

            <Section title="Details">
              <DetailList>
                <Row label="Vendor phone" value={selected.vendor?.business_phone} />
                <Row label="Reference" value={<span className="font-mono text-xs">{selected.reference}</span>} />
                {selected.transfer_code && <Row label="Paystack transfer" value={<span className="font-mono text-xs">{selected.transfer_code}</span>} />}
              </DetailList>
            </Section>

            {selected.status === 'pending_approval' && (
              <>
                <Callout tone="info">Check the account name matches the vendor or their business before you approve.</Callout>
                <Field label="Reason for rejecting" hint="Only needed to reject. The vendor sees this and gets the money back in their wallet.">
                  <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
                <p className="text-xs text-slate-500">Turn off transfer OTP in your Paystack settings so approved transfers go through straight away.</p>
              </>
            )}
          </>
        )}
      </Sheet>
    </div>
  );
}
