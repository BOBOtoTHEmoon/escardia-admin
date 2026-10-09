'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Percent, ShieldCheck, Clock, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dateTime, naira } from '@/lib/format';
import { AffixInput, Button, Callout, Card, Field, PageHeader, Spinner } from '../_components/ui';
import { toast } from '../_components/feedback';

interface Settings {
  commission_rate: number;
  service_fee: number;
  delivery_fee: number;
  legion_price_per_day: number;
  private_price_per_day: number;
  hilux_price_per_day: number;
  min_hours_before_start: number;
  payment_window_minutes: number;
  payout_hold_hours: number;
  withdrawal_fee: number;
  min_withdrawal: number;
  withdrawals_require_approval: boolean;
  updated_at: string;
}

type Form = Record<Exclude<keyof Settings, 'updated_at' | 'withdrawals_require_approval' | 'commission_rate'> | 'commission_pct', string>;

const KEYS = [
  'service_fee',
  'delivery_fee',
  'legion_price_per_day',
  'private_price_per_day',
  'hilux_price_per_day',
  'min_hours_before_start',
  'payment_window_minutes',
  'payout_hold_hours',
  'withdrawal_fee',
  'min_withdrawal',
] as const;

const toForm = (s: Settings): Form => ({
  commission_pct: String(Math.round(Number(s.commission_rate) * 10000) / 100),
  ...(Object.fromEntries(KEYS.map((k) => [k, String(Number(s[k]))])) as Omit<Form, 'commission_pct'>),
});

/**
 * These numbers are used by the database for every new booking and payout.
 * Changing them does not change bookings that already exist.
 */
export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .single()
      .then(({ data }) => {
        if (!data) return;
        setS(data as Settings);
        setForm(toForm(data as Settings));
      });
  }, []);

  const dirty = useMemo(() => !!s && !!form && JSON.stringify(toForm(s)) !== JSON.stringify(form), [s, form]);

  if (!s || !form) return <Spinner />;

  const set = (key: keyof Form) => (v: string) => setForm({ ...form, [key]: v });

  const save = async () => {
    const pct = Number(form.commission_pct);
    if (!(pct >= 0 && pct <= 50)) return toast.error('Commission must be between 0 and 50%.');
    const values = Object.fromEntries(KEYS.map((k) => [k, Number(form[k])]));
    if (Object.values(values).some((v) => !Number.isFinite(v) || v < 0)) return toast.error('Numbers cannot be empty or below zero.');
    setSaving(true);
    const { data, error } = await supabase
      .from('settings')
      .update({ ...values, commission_rate: pct / 100, updated_at: new Date().toISOString() })
      .eq('id', true)
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setS(data as Settings);
    setForm(toForm(data as Settings));
    toast.success('Settings saved. New bookings use these numbers from now on.');
  };

  // Example booking so the effect of the numbers is easy to see
  const exampleRental = 100000;
  const exampleCommission = exampleRental * (Number(form.commission_pct) / 100);
  const exampleEscardia = exampleCommission + Number(form.service_fee);

  return (
    <div className="max-w-5xl space-y-6 pb-20">
      <PageHeader title="Settings" subtitle={`Prices and rules for new bookings. Last changed ${dateTime(s.updated_at)}.`} />

      <Callout tone="info">Changes apply to new bookings only. Trips that are already booked keep the prices they were paid at.</Callout>

      <SettingsSection icon={Percent} title="Commission and fees" description="What Escardia earns on every booking.">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Commission" hint="Taken from car rental and delivery">
            <AffixInput suffix="%" step="0.5" value={form.commission_pct} onChange={set('commission_pct')} />
          </Field>
          <Field label="Service fee" hint="Flat fee per booking">
            <AffixInput prefix="₦" value={form.service_fee} onChange={set('service_fee')} />
          </Field>
          <Field label="Delivery fee" hint="When the car is delivered">
            <AffixInput prefix="₦" value={form.delivery_fee} onChange={set('delivery_fee')} />
          </Field>
        </div>
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          Example: on a <span className="tabular font-medium text-slate-900">{naira(exampleRental)}</span> rental, Escardia earns{' '}
          <span className="tabular font-semibold text-brand-700">{naira(exampleEscardia)}</span> ({naira(exampleCommission)} commission plus the {naira(form.service_fee)} service
          fee) and the vendor gets <span className="tabular font-medium text-slate-900">{naira(exampleRental - exampleCommission)}</span>.
        </div>
      </SettingsSection>

      <SettingsSection icon={ShieldCheck} title="Security escorts" description="Daily prices customers pay for security. Escardia keeps all of it.">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="LEGION" hint="Per person, per day">
            <AffixInput prefix="₦" value={form.legion_price_per_day} onChange={set('legion_price_per_day')} />
          </Field>
          <Field label="PRIVATE" hint="Per person, per day">
            <AffixInput prefix="₦" value={form.private_price_per_day} onChange={set('private_price_per_day')} />
          </Field>
          <Field label="Hilux" hint="Per vehicle, per day">
            <AffixInput prefix="₦" value={form.hilux_price_per_day} onChange={set('hilux_price_per_day')} />
          </Field>
        </div>
        <p className="mt-4 text-xs text-slate-500">The app still shows its own escort prices on the ride mode screen; the server price is what customers pay. Keep them the same.</p>
      </SettingsSection>

      <SettingsSection icon={Clock} title="Booking rules" description="How far ahead customers book and how long they have to pay.">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Book at least" hint="Before the trip starts">
            <AffixInput suffix="hours" value={form.min_hours_before_start} onChange={set('min_hours_before_start')} />
          </Field>
          <Field label="Time to pay" hint="Unpaid bookings free the car after this">
            <AffixInput suffix="mins" value={form.payment_window_minutes} onChange={set('payment_window_minutes')} />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection icon={Wallet} title="Vendor payouts" description="When vendors can withdraw and what it costs them.">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Payout hold" hint="After a trip ends, for customers to report problems">
            <AffixInput suffix="hours" value={form.payout_hold_hours} onChange={set('payout_hold_hours')} />
          </Field>
          <Field label="Withdrawal fee" hint="Covers the Paystack transfer">
            <AffixInput prefix="₦" value={form.withdrawal_fee} onChange={set('withdrawal_fee')} />
          </Field>
          <Field label="Minimum withdrawal">
            <AffixInput prefix="₦" value={form.min_withdrawal} onChange={set('min_withdrawal')} />
          </Field>
        </div>
      </SettingsSection>

      {/* Save bar */}
      <div
        className={`fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 transition-all duration-300 lg:bottom-6 lg:left-[260px] ${
          dirty ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <div className="flex w-full max-w-xl items-center justify-between gap-4 rounded-2xl bg-slate-900 py-3 pl-5 pr-3 text-white shadow-2xl">
          <p className="text-sm">You have unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => setForm(toForm(s))}>
              Discard
            </Button>
            <Button loading={saving} onClick={save}>
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ icon: Icon, title, description, children }: { icon: typeof Percent; title: string; description: string; children: ReactNode }) {
  return (
    <Card className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[240px_1fr]">
      <div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
          <Icon className="h-[18px] w-[18px] text-brand-600" />
        </div>
        <h2 className="mt-3 font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div>{children}</div>
    </Card>
  );
}
