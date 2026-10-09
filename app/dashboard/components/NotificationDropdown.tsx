'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, ShieldAlert, Wallet, BellRing, CheckCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { timeAgo } from '@/lib/format';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string | null;
  read: boolean;
  created_at: string;
}

export const notificationLink = (type: string | null) => {
  if (type?.includes('withdrawal')) return '/dashboard/withdrawals';
  if (type?.includes('dispute')) return '/dashboard/disputes';
  return '/dashboard/notifications';
};

export const NotificationIcon = ({ type, read }: { type: string | null; read: boolean }) => {
  const Icon = type?.includes('withdrawal') ? Wallet : type?.includes('dispute') ? ShieldAlert : BellRing;
  const tint = read ? 'bg-slate-100 text-slate-400' : type?.includes('dispute') ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600';
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tint}`}>
      <Icon className="h-4 w-4" />
    </div>
  );
};

/** Admin notifications: new withdrawals, disputes, etc. (created by the database). */
export default function NotificationDropdown({ onChange }: { onChange?: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, type, read, created_at')
      .order('created_at', { ascending: false })
      .limit(8);
    setItems(data ?? []);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('read', false);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    onChange?.();
  };

  const openItem = async (n: Notification) => {
    setOpen(false);
    if (!n.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      onChange?.();
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) load();
        }}
        className={`relative rounded-lg p-2 transition-colors ${open ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 animate-pop-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              {unread > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">{unread}</span>}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto border-t border-slate-100">
            {items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <Bell className="h-6 w-6 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">You&apos;re all caught up</p>
              </div>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={notificationLink(n.type)}
                  onClick={() => openItem(n)}
                  className="flex gap-3 border-b border-slate-50 px-4 py-3 transition-colors last:border-0 hover:bg-slate-50"
                >
                  <NotificationIcon type={n.type} read={n.read} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${n.read ? 'text-slate-600' : 'font-medium text-slate-900'}`}>{n.title}</p>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                    </div>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.created_at)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
          <Link
            href="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
