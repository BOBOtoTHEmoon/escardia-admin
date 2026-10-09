'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dateOnly, fullName, naira } from '@/lib/format';
import { Badge, Empty, Identity, PageHeader, SearchInput, Spinner, Table, Tabs, Td, Toolbar, Tr } from '../_components/ui';

type Role = 'customer' | 'vendor' | 'admin' | 'all';

const ROLE_BADGE = { customer: 'gray', vendor: 'blue', admin: 'violet' } as const;

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Role>('customer');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const [{ data: profiles }, { data: wallets }, { data: bookings }] = await Promise.all([
        supabase.from('profiles').select('id, role, first_name, last_name, email, phone, avatar_url, created_at').order('created_at', { ascending: false }),
        supabase.from('wallets').select('user_id, available, pending'),
        supabase.from('bookings').select('customer_id').not('status', 'in', '(expired,pending_payment)'),
      ]);
      const walletBy = Object.fromEntries((wallets ?? []).map((w) => [w.user_id, w]));
      const tripCount: Record<string, number> = {};
      (bookings ?? []).forEach((b) => (tripCount[b.customer_id] = (tripCount[b.customer_id] ?? 0) + 1));
      setUsers((profiles ?? []).map((p) => ({ ...p, wallet: walletBy[p.id], trips: tripCount[p.id] ?? 0 })));
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (tab !== 'all' && u.role !== tab) return false;
      if (!q) return true;
      return [u.first_name, u.last_name, u.email, u.phone].filter(Boolean).some((s: string) => s.toLowerCase().includes(q));
    });
  }, [users, tab, search]);

  const count = (r: Role) => (r === 'all' ? users.length : users.filter((u) => u.role === r).length);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle="Everyone with an Escardia account." />

      <Toolbar>
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'customer', label: 'Customers', count: count('customer') },
            { value: 'vendor', label: 'Vendors', count: count('vendor') },
            { value: 'admin', label: 'Admins', count: count('admin') },
            { value: 'all', label: 'All', count: count('all') },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, phone" />
      </Toolbar>

      {filtered.length === 0 ? (
        <Empty icon={Users} text={search ? 'No users match your search' : 'No users here'} />
      ) : (
        <Table
          columns={['Name', 'Phone', ...(tab === 'all' ? ['Role'] : []), { label: 'Trips', align: 'right' as const }, { label: 'Wallet', align: 'right' as const }, 'Joined']}
          footer={`${filtered.length} user${filtered.length === 1 ? '' : 's'}`}
        >
          {filtered.map((u) => (
            <Tr key={u.id}>
              <Td>
                <Identity name={fullName(u.first_name, u.last_name)} sub={u.email} image={u.avatar_url} />
              </Td>
              <Td className="whitespace-nowrap">{u.phone || <span className="text-slate-400">-</span>}</Td>
              {tab === 'all' && (
                <Td>
                  <Badge tone={ROLE_BADGE[u.role as keyof typeof ROLE_BADGE] ?? 'gray'} dot={false}>
                    <span className="capitalize">{u.role}</span>
                  </Badge>
                </Td>
              )}
              <Td align="right" className="tabular">
                {u.trips}
              </Td>
              <Td align="right" className="tabular whitespace-nowrap">
                <p className="text-slate-900">{naira(u.wallet?.available)}</p>
                {Number(u.wallet?.pending) > 0 && <p className="text-xs text-slate-500">{naira(u.wallet.pending)} on hold</p>}
              </Td>
              <Td className="whitespace-nowrap text-slate-500">{dateOnly(u.created_at)}</Td>
            </Tr>
          ))}
        </Table>
      )}
      <p className="text-xs text-slate-500">
        To remove someone&apos;s account, delete them in Supabase under Authentication &gt; Users. Keep accounts that have bookings for your records.
      </p>
    </div>
  );
}
