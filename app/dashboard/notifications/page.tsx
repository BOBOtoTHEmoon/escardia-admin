'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dateOnly, timeAgo } from '@/lib/format';
import { Button, Card, Empty, PageHeader, Spinner, Tabs } from '../_components/ui';
import { NotificationIcon } from '../components/NotificationDropdown';
import { useAdmin } from '../_components/admin-context';

const linkFor = (type: string | null) => (type?.includes('withdrawal') ? '/dashboard/withdrawals' : type?.includes('dispute') ? '/dashboard/disputes' : null);

/** Admin alerts created by the database: withdrawal requests and disputes. */
export default function NotificationsPage() {
  const { refreshCounts } = useAdmin();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200);
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    await supabase.from('notifications').update({ read: true }).eq('read', false);
    load();
    refreshCounts();
  };

  const markOne = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    refreshCounts();
  };

  // Group by day
  const groups = useMemo(() => {
    const list = tab === 'unread' ? rows.filter((r) => !r.read) : rows;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const out: { label: string; items: any[] }[] = [];
    list.forEach((n) => {
      const d = new Date(n.created_at).toDateString();
      const label = d === today ? 'Today' : d === yesterday ? 'Yesterday' : dateOnly(n.created_at);
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(n);
      else out.push({ label, items: [n] });
    });
    return out;
  }, [rows, tab]);

  const unread = rows.filter((r) => !r.read).length;

  if (loading) return <Spinner />;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Alerts for things that need you, like withdrawal requests and disputes."
        action={
          unread > 0 && (
            <Button variant="secondary" onClick={markAll}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: 'All', count: rows.length },
          { value: 'unread', label: 'Unread', count: unread },
        ]}
      />

      {groups.length === 0 ? (
        <Empty icon={Bell} text={tab === 'unread' ? "You're all caught up" : 'No notifications yet'} />
      ) : (
        groups.map((g) => (
          <div key={g.label}>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{g.label}</p>
            <Card className="divide-y divide-slate-100 overflow-hidden">
              {g.items.map((n) => {
                const link = linkFor(n.type);
                const content = (
                  <div className="flex gap-4 px-5 py-4">
                    <NotificationIcon type={n.type} read={n.read} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-sm ${n.read ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>{n.title}</p>
                        <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.body && <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>}
                    </div>
                    {link && <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-300" />}
                    {!n.read && !link && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                  </div>
                );
                return link ? (
                  <Link key={n.id} href={link} onClick={() => !n.read && markOne(n.id)} className={`block transition-colors hover:bg-slate-50 ${n.read ? '' : 'bg-brand-50/40'}`}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id} className={n.read ? '' : 'bg-brand-50/40'}>
                    {content}
                  </div>
                );
              })}
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
