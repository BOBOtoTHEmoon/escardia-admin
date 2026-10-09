'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Star, MapPin, Users, Cog, Fuel, CarFront, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dateOnly, naira } from '@/lib/format';
import {
  Button,
  Callout,
  Card,
  DetailList,
  Empty,
  Field,
  PageHeader,
  Row,
  SearchInput,
  Section,
  Sheet,
  Spinner,
  StatusBadge,
  Tabs,
  Toolbar,
  inputClass,
} from '../_components/ui';
import { toast } from '../_components/feedback';
import { useAdmin } from '../_components/admin-context';

type Approval = 'pending' | 'approved' | 'rejected';

interface CarRow {
  id: string;
  vendor_id: string;
  brand: string;
  model: string;
  year: string | null;
  type: string | null;
  price_per_day: number;
  price_per_hour: number;
  seats: number | null;
  doors: number | null;
  transmission: string | null;
  fuel_type: string | null;
  location: string | null;
  description: string | null;
  photos: string[];
  status: string;
  approval_status: Approval;
  rejection_reason: string | null;
  is_active: boolean;
  rating_avg: number;
  rating_count: number;
  total_bookings: number;
  created_at: string;
  vendors: { business_name: string | null; status: string } | null;
}

export default function CarsPage() {
  const { refreshCounts } = useAdmin();
  const [cars, setCars] = useState<CarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Approval | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CarRow | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<Approval | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('cars').select('*, vendors(business_name, status)').order('created_at', { ascending: false });
    setCars((data as CarRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (status: Approval) => {
    if (!selected) return;
    if (status === 'rejected' && !reason.trim()) {
      toast.error('Add a reason first. The vendor will see it.');
      return;
    }
    setBusy(status);
    const { error } = await supabase.rpc('admin_set_car_approval', {
      p_car_id: selected.id,
      p_status: status,
      p_reason: status === 'rejected' ? reason.trim() : null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    const name = `${selected.brand} ${selected.model}`;
    toast.success(status === 'approved' ? `${name} is live` : selected.approval_status === 'approved' ? `${name} was taken down` : `${name} was rejected`);
    setSelected(null);
    load();
    refreshCounts();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cars.filter((c) => {
      if (tab !== 'all' && c.approval_status !== tab) return false;
      if (!q) return true;
      return [c.brand, c.model, c.location, c.vendors?.business_name].filter(Boolean).some((s) => s!.toLowerCase().includes(q));
    });
  }, [cars, tab, search]);

  const count = (s: Approval) => cars.filter((c) => c.approval_status === s).length;

  const open = (c: CarRow) => {
    setSelected(c);
    setPhotoIndex(0);
    setReason(c.rejection_reason ?? '');
  };

  if (loading) return <Spinner />;

  const photos = selected?.photos ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Cars" subtitle="Approve cars before customers can see them. Changing photos, brand, model or year sends a car back here." />

      <Toolbar>
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pending', label: 'Pending', count: count('pending'), alert: true },
            { value: 'approved', label: 'Live', count: count('approved') },
            { value: 'rejected', label: 'Rejected', count: count('rejected') },
            { value: 'all', label: 'All', count: cars.length },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search car, location, vendor" />
      </Toolbar>

      {filtered.length === 0 ? (
        <Empty
          icon={CarFront}
          text={search ? 'No cars match your search' : tab === 'pending' ? 'No cars waiting for approval' : 'No cars here'}
          hint={tab === 'pending' && !search ? 'New and edited listings show up here for review.' : undefined}
        />
      ) : (
        <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => open(c)} className="group block w-full text-left align-top">
              <Card className="overflow-hidden transition-shadow group-hover:shadow-md">
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  {c.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.photos[0]} alt={`${c.brand} ${c.model}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <CarFront className="h-10 w-10 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute left-3 top-3">
                    <StatusBadge status={c.approval_status} />
                  </div>
                  {c.photos?.length > 1 && (
                    <span className="absolute bottom-3 right-3 rounded-md bg-slate-900/60 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                      {c.photos.length} photos
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {c.brand} {c.model}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {c.year} · {c.vendors?.business_name || 'Unknown vendor'}
                      </p>
                    </div>
                    {c.rating_count > 0 && (
                      <span className="flex shrink-0 items-center gap-1 text-sm text-slate-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {Number(c.rating_avg).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <p className="text-sm">
                      <span className="tabular font-semibold text-slate-900">{naira(c.price_per_day)}</span>
                      <span className="text-slate-500"> / day</span>
                    </p>
                    {c.location && (
                      <span className="flex max-w-[50%] items-center gap-1 truncate text-xs text-slate-500">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.location}</span>
                      </span>
                    )}
                  </div>
                  {c.vendors?.status !== 'approved' && (
                    <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Vendor not approved, so this car stays hidden
                    </p>
                  )}
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
        title={selected ? `${selected.brand} ${selected.model} ${selected.year ?? ''}` : ''}
        subtitle={selected && <span className="flex items-center gap-2">{selected.vendors?.business_name} · <StatusBadge status={selected.approval_status} /></span>}
        footer={
          selected && (
            <>
              {selected.approval_status !== 'rejected' && (
                <Button
                  variant={selected.approval_status === 'approved' ? 'danger' : 'secondary'}
                  loading={busy === 'rejected'}
                  disabled={!!busy}
                  onClick={() => review('rejected')}
                  className={selected.approval_status === 'approved' ? '' : 'text-red-600'}
                >
                  {selected.approval_status === 'approved' ? 'Take down' : 'Reject'}
                </Button>
              )}
              {selected.approval_status !== 'approved' && (
                <Button variant="success" loading={busy === 'approved'} disabled={!!busy} onClick={() => review('approved')}>
                  Approve car
                </Button>
              )}
            </>
          )
        }
      >
        {selected && (
          <>
            {photos.length > 0 && (
              <div>
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photos[photoIndex]} alt="" className="h-full w-full object-cover" />
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={() => setPhotoIndex((photoIndex - 1 + photos.length) % photos.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-sm hover:bg-white"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="h-4 w-4 text-slate-700" />
                      </button>
                      <button
                        onClick={() => setPhotoIndex((photoIndex + 1) % photos.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-sm hover:bg-white"
                        aria-label="Next photo"
                      >
                        <ChevronRight className="h-4 w-4 text-slate-700" />
                      </button>
                      <span className="absolute bottom-3 right-3 rounded-md bg-slate-900/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
                        {photoIndex + 1} / {photos.length}
                      </span>
                    </>
                  )}
                </div>
                {photos.length > 1 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {photos.map((p, i) => (
                      <button
                        key={p}
                        onClick={() => setPhotoIndex(i)}
                        className={`shrink-0 overflow-hidden rounded-lg ring-2 transition ${i === photoIndex ? 'ring-brand-600' : 'opacity-70 ring-transparent hover:opacity-100'}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p} alt="" className="h-12 w-16 object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selected.rejection_reason && selected.approval_status === 'rejected' && (
              <Callout tone="warning" title="Rejected">
                {selected.rejection_reason}
              </Callout>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Users, label: 'Seats', value: selected.seats ?? '-' },
                { icon: CarFront, label: 'Type', value: selected.type ?? '-' },
                { icon: Cog, label: 'Gearbox', value: selected.transmission ?? '-' },
                { icon: Fuel, label: 'Fuel', value: selected.fuel_type ?? '-' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <Icon className="h-4 w-4 text-slate-400" />
                  <p className="mt-2 text-xs text-slate-500">{label}</p>
                  <p className="truncate text-sm font-medium capitalize text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Section title="Pricing">
                <DetailList>
                  <Row label="Per day" value={naira(selected.price_per_day)} strong />
                  <Row label="Per hour" value={selected.price_per_hour > 0 ? naira(selected.price_per_hour) : 'Not offered'} />
                  <Row label="Doors" value={selected.doors ?? '-'} />
                </DetailList>
              </Section>
              <Section title="Listing">
                <DetailList>
                  <Row label="Availability" value={<StatusBadge status={selected.status} />} />
                  <Row label="Location" value={selected.location} />
                  <Row label="Listed" value={dateOnly(selected.created_at)} />
                  <Row label="Bookings" value={selected.total_bookings} />
                </DetailList>
              </Section>
            </div>

            {selected.description && (
              <Section title="Description">
                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{selected.description}</p>
              </Section>
            )}

            {selected.approval_status !== 'rejected' && (
              <Field label={selected.approval_status === 'approved' ? 'Reason for taking down' : 'Reason for rejecting'} hint="Needed to reject or take down. The vendor sees this.">
                <textarea className={inputClass} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
            )}
          </>
        )}
      </Sheet>
    </div>
  );
}
