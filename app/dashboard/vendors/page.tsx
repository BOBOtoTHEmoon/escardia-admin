'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Phone, Mail, Building2, Landmark, ExternalLink, ImageOff, ChevronRight, Store } from 'lucide-react';
import { supabase, signedDocUrl } from '@/lib/supabase';
import { dateOnly, fullName, naira } from '@/lib/format';
import {
  Avatar,
  Button,
  Callout,
  DetailList,
  Empty,
  Field,
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
  inputClass,
} from '../_components/ui';
import { toast } from '../_components/feedback';
import { useAdmin } from '../_components/admin-context';

type Status = 'pending' | 'approved' | 'rejected' | 'suspended';

interface Vendor {
  id: string;
  business_name: string | null;
  business_phone: string | null;
  status: Status;
  rejection_reason: string | null;
  created_at: string;
  approved_at: string | null;
  profile: { first_name: string | null; last_name: string | null; email: string | null; phone: string | null } | null;
  private: {
    nin: string | null;
    id_type: string | null;
    id_front_path: string | null;
    id_back_path: string | null;
    cac_certificate_path: string | null;
    proof_of_address_path: string | null;
    bank_name: string | null;
    account_number: string | null;
    account_name: string | null;
  } | null;
  carCount: number;
  wallet: { available: number; pending: number } | null;
}

export default function VendorsPage() {
  const { refreshCounts } = useAdmin();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Status | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [docs, setDocs] = useState<Record<string, string | null> | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<Status | null>(null);

  const load = useCallback(async () => {
    const [{ data: v }, { data: p }, { data: vp }, { data: cars }, { data: w }] = await Promise.all([
      supabase.from('vendors').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, first_name, last_name, email, phone').eq('role', 'vendor'),
      supabase.from('vendor_private').select('*'),
      supabase.from('cars').select('vendor_id'),
      supabase.from('wallets').select('user_id, available, pending'),
    ]);
    const byId = <T extends Record<string, any>>(rows: T[] | null, key: string) => Object.fromEntries((rows ?? []).map((r) => [r[key], r]));
    const profiles = byId(p, 'id');
    const priv = byId(vp, 'vendor_id');
    const wallets = byId(w, 'user_id');
    const carCounts: Record<string, number> = {};
    (cars ?? []).forEach((c) => (carCounts[c.vendor_id] = (carCounts[c.vendor_id] ?? 0) + 1));

    setVendors(
      (v ?? []).map((row) => ({
        ...row,
        profile: profiles[row.id] ?? null,
        private: priv[row.id] ?? null,
        carCount: carCounts[row.id] ?? 0,
        wallet: wallets[row.id] ? { available: Number(wallets[row.id].available), pending: Number(wallets[row.id].pending) } : null,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openVendor = async (v: Vendor) => {
    setSelected(v);
    setReason(v.rejection_reason ?? '');
    setDocs(null);
    const p = v.private;
    const [idFront, idBack, cac, proof] = await Promise.all([
      signedDocUrl(p?.id_front_path),
      signedDocUrl(p?.id_back_path),
      signedDocUrl(p?.cac_certificate_path),
      signedDocUrl(p?.proof_of_address_path),
    ]);
    setDocs({ 'ID front': idFront, 'ID back': idBack, 'CAC certificate': cac, 'Proof of address': proof });
  };

  const setStatus = async (status: Status) => {
    if (!selected) return;
    if ((status === 'rejected' || status === 'suspended') && !reason.trim()) {
      toast.error('Add a reason first. The vendor will see it.');
      return;
    }
    setBusy(status);
    const { error } = await supabase.rpc('admin_set_vendor_status', {
      p_vendor_id: selected.id,
      p_status: status,
      p_reason: status === 'approved' ? null : reason.trim(),
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    const name = selected.business_name || 'Vendor';
    toast.success(status === 'approved' ? `${name} is approved` : status === 'rejected' ? `${name} was rejected` : `${name} is suspended`);
    setSelected(null);
    load();
    refreshCounts();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (tab !== 'all' && v.status !== tab) return false;
      if (!q) return true;
      return [v.business_name, v.profile?.email, v.profile?.first_name, v.profile?.last_name, v.business_phone]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q));
    });
  }, [vendors, tab, search]);

  const count = (s: Status) => vendors.filter((v) => v.status === s).length;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Vendors" subtitle="Check documents, then approve vendors so their cars can go live." />

      <Toolbar>
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pending', label: 'Pending', count: count('pending'), alert: true },
            { value: 'approved', label: 'Approved', count: count('approved') },
            { value: 'rejected', label: 'Rejected', count: count('rejected') },
            { value: 'suspended', label: 'Suspended', count: count('suspended') },
            { value: 'all', label: 'All', count: vendors.length },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search business, owner, email" />
      </Toolbar>

      {filtered.length === 0 ? (
        <Empty
          icon={Store}
          text={search ? 'No vendors match your search' : tab === 'pending' ? 'No vendors waiting for approval' : 'No vendors here'}
          hint={tab === 'pending' && !search ? 'New vendor sign ups show up here for review.' : undefined}
        />
      ) : (
        <Table
          columns={['Business', 'Owner', { label: 'Cars', align: 'right' }, { label: 'Balance', align: 'right' }, 'Joined', 'Status', '']}
          footer={`${filtered.length} vendor${filtered.length === 1 ? '' : 's'}`}
        >
          {filtered.map((v) => (
            <Tr key={v.id} onClick={() => openVendor(v)}>
              <Td>
                <Identity name={v.business_name || 'No business name'} sub={v.business_phone} />
              </Td>
              <Td>
                <p className="text-slate-900">{fullName(v.profile?.first_name, v.profile?.last_name)}</p>
                <p className="text-xs text-slate-500">{v.profile?.email}</p>
              </Td>
              <Td align="right" className="tabular">
                {v.carCount}
              </Td>
              <Td align="right" className="tabular whitespace-nowrap">
                {naira((v.wallet?.available ?? 0) + (v.wallet?.pending ?? 0))}
              </Td>
              <Td className="whitespace-nowrap text-slate-500">{dateOnly(v.created_at)}</Td>
              <Td>
                <StatusBadge status={v.status} />
              </Td>
              <Td align="right">
                <ChevronRight className="ml-auto h-4 w-4 text-slate-300 group-hover:text-slate-500" />
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        wide
        title={
          selected && (
            <span className="flex items-center gap-3">
              <Avatar text={selected.business_name || 'V'} />
              {selected.business_name || 'Vendor'}
            </span>
          )
        }
        subtitle={selected && <span className="flex items-center gap-2">Joined {dateOnly(selected.created_at)} · <StatusBadge status={selected.status} /></span>}
        footer={
          selected && (
            <>
              {selected.status === 'pending' && (
                <Button variant="secondary" loading={busy === 'rejected'} disabled={!!busy} onClick={() => setStatus('rejected')} className="text-red-600">
                  Reject
                </Button>
              )}
              {selected.status === 'approved' && (
                <Button variant="danger" loading={busy === 'suspended'} disabled={!!busy} onClick={() => setStatus('suspended')}>
                  Suspend vendor
                </Button>
              )}
              {selected.status !== 'approved' && (
                <Button variant="success" loading={busy === 'approved'} disabled={!!busy} onClick={() => setStatus('approved')}>
                  Approve vendor
                </Button>
              )}
            </>
          )
        }
      >
        {selected && (
          <>
            {selected.rejection_reason && selected.status !== 'approved' && (
              <Callout tone="warning" title={selected.status === 'suspended' ? 'Suspended' : 'Rejected'}>
                {selected.rejection_reason}
              </Callout>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <Section title="Business" icon={Building2}>
                <DetailList>
                  <Row label="Owner" value={fullName(selected.profile?.first_name, selected.profile?.last_name)} />
                  <Row
                    label="Email"
                    value={
                      <a href={`mailto:${selected.profile?.email}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                        <Mail className="h-3 w-3" />
                        {selected.profile?.email}
                      </a>
                    }
                  />
                  <Row
                    label="Phone"
                    value={
                      <a href={`tel:${selected.business_phone || selected.profile?.phone}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                        <Phone className="h-3 w-3" />
                        {selected.business_phone || selected.profile?.phone || '-'}
                      </a>
                    }
                  />
                  <Row label="Cars listed" value={selected.carCount} />
                </DetailList>
              </Section>
              <Section title="Identity and payouts" icon={Landmark}>
                <DetailList>
                  <Row label="ID type" value={selected.private?.id_type || 'Not provided'} />
                  <Row label="NIN" value={selected.private?.nin || 'Not provided'} />
                  <Row label="Bank" value={selected.private?.bank_name || 'Not added'} />
                  <Row label="Account" value={selected.private?.account_number ? `${selected.private.account_number} · ${selected.private.account_name}` : 'Not added'} />
                </DetailList>
              </Section>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Available to withdraw</p>
                <p className="tabular mt-1 text-lg font-semibold text-slate-900">{naira(selected.wallet?.available)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">On hold</p>
                <p className="tabular mt-1 text-lg font-semibold text-slate-900">{naira(selected.wallet?.pending)}</p>
              </div>
            </div>

            <Section title="Documents" icon={FileText}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {docs === null
                  ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-slate-100" />)
                  : Object.entries(docs).map(([label, url]) => (
                      <a
                        key={label}
                        href={url ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className={`group block overflow-hidden rounded-xl border ${url ? 'border-slate-200 hover:border-brand-400' : 'pointer-events-none border-dashed border-slate-300'}`}
                      >
                        <div className="relative aspect-[4/3] bg-slate-50">
                          {url ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={label} className="h-full w-full object-cover" />
                              <span className="absolute right-1.5 top-1.5 rounded-md bg-white/90 p-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                                <ExternalLink className="h-3 w-3 text-slate-600" />
                              </span>
                            </>
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
                              <ImageOff className="h-4 w-4" />
                              <span className="text-[11px]">Not uploaded</span>
                            </div>
                          )}
                        </div>
                        <p className="truncate px-2.5 py-2 text-xs font-medium text-slate-700">{label}</p>
                      </a>
                    ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Links expire after 30 minutes. Check the name on the ID matches the owner.</p>
            </Section>

            {selected.status !== 'rejected' && (
              <Field label={selected.status === 'approved' ? 'Reason for suspending' : 'Reason for rejecting'} hint="Needed to reject or suspend. The vendor sees this.">
                <textarea className={inputClass} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
            )}
            {selected.status === 'approved' && <p className="text-xs text-slate-500">Suspending hides all of this vendor&apos;s cars from customers.</p>}
          </>
        )}
      </Sheet>
    </div>
  );
}
