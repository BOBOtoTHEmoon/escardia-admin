'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { Button, inputClass } from './ui';

/* ------------------------------------------------------------------ */
/* Toasts: toast.success('Saved'), toast.error(err.message)            */
/* ------------------------------------------------------------------ */

type ToastType = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let pushToast: ((t: ToastItem) => void) | null = null;
let nextId = 1;

const emit = (type: ToastType, message: string) => pushToast?.({ id: nextId++, type, message });

export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
  info: (message: string) => emit('info', message),
};

const TOAST_ICON = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  error: <XCircle className="h-5 w-5 text-red-500" />,
  info: <Info className="h-5 w-5 text-brand-600" />,
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    pushToast = (t) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), t.type === 'error' ? 7000 : 4000);
    };
    return () => {
      pushToast = null;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 pb-24 sm:items-end sm:p-6 sm:pb-24 lg:pb-6">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-slate-200"
        >
          {TOAST_ICON[t.type]}
          <p className="flex-1 text-sm text-slate-800">{t.message}</p>
          <button onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confirm and prompt dialogs that return a promise                    */
/* ------------------------------------------------------------------ */

interface DialogRequest {
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: 'primary' | 'danger' | 'success';
  /** When set, the dialog asks for text and resolves with it. */
  input?: { label: string; placeholder?: string; required?: boolean; multiline?: boolean };
  resolve: (value: string | boolean | null) => void;
}

let openDialog: ((r: DialogRequest) => void) | null = null;

/** Resolves true if the admin confirms. */
export const confirmAction = (opts: Omit<DialogRequest, 'resolve' | 'input'>) =>
  new Promise<boolean>((resolve) => {
    if (!openDialog) return resolve(window.confirm(opts.message ?? opts.title));
    openDialog({ ...opts, resolve: (v) => resolve(v === true) });
  });

/** Resolves with the text typed, or null if cancelled. */
export const promptAction = (opts: Omit<DialogRequest, 'resolve'> & { input: NonNullable<DialogRequest['input']> }) =>
  new Promise<string | null>((resolve) => {
    if (!openDialog) return resolve(window.prompt(opts.message ?? opts.title));
    openDialog({ ...opts, resolve: (v) => resolve(typeof v === 'string' ? v : null) });
  });

export function DialogHost() {
  const [req, setReq] = useState<DialogRequest | null>(null);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    openDialog = (r) => {
      setText('');
      setReq(r);
    };
    return () => {
      openDialog = null;
    };
  }, []);

  useEffect(() => {
    if (!req) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  if (!req) return null;

  const close = (value: string | boolean | null) => {
    req.resolve(value);
    setReq(null);
  };

  const submit = () => {
    if (req.input) {
      if (req.input.required !== false && !text.trim()) return;
      close(text.trim());
    } else close(true);
  };

  const danger = req.tone === 'danger';
  const InputTag = req.input?.multiline ? 'textarea' : 'input';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-[2px]" onClick={() => close(null)} />
      <div className="relative w-full max-w-md animate-pop-in rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-50' : 'bg-brand-50'}`}>
            {danger ? <AlertTriangle className="h-5 w-5 text-red-600" /> : <Info className="h-5 w-5 text-brand-600" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-slate-900">{req.title}</h3>
            {req.message && <p className="mt-1 text-sm text-slate-600">{req.message}</p>}
            {req.input && (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">{req.input.label}</span>
                <InputTag
                  ref={inputRef}
                  rows={req.input.multiline ? 3 : undefined}
                  className={inputClass}
                  placeholder={req.input.placeholder}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => !req.input?.multiline && e.key === 'Enter' && submit()}
                />
              </label>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => close(null)}>
            Cancel
          </Button>
          <Button
            variant={req.tone === 'danger' ? 'danger' : req.tone === 'success' ? 'success' : 'primary'}
            onClick={submit}
            disabled={!!req.input && req.input.required !== false && !text.trim()}
          >
            {req.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}
