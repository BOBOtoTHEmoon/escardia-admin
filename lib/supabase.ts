// ============================================
// ESCARDIA ADMIN - Supabase client
// The publishable key is safe in the browser. Every admin action is checked
// again in the database (is_admin), so a normal user cannot use this site.
// ============================================
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://twmojaxvuuptezskdwbj.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_latNs_LJxwyPvPcdlkgTVA_12YWVaL0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export interface AdminProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

/** Returns the signed-in admin, or null if not signed in / not an admin. */
export const getAdmin = async (): Promise<AdminProfile | null> => {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  const { data: p } = await supabase.from('profiles').select('id, email, first_name, last_name, role').eq('id', user.id).maybeSingle();
  if (!p || p.role !== 'admin') return null;
  return { id: p.id, email: p.email ?? user.email ?? '', firstName: p.first_name ?? '', lastName: p.last_name ?? '' };
};

/** Calls an Edge Function and returns a readable error. */
export const callFunction = async <T = unknown>(name: string, body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx?.json) message = (await ctx.json())?.error ?? message;
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
};

/** Short-lived link to a private vendor document. */
export const signedDocUrl = async (path: string | null | undefined) => {
  if (!path) return null;
  if (/^https?:/i.test(path)) return path;
  const { data } = await supabase.storage.from('vendor-docs').createSignedUrl(path, 60 * 30);
  return data?.signedUrl ?? null;
};
