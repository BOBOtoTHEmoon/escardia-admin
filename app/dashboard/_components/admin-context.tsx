'use client';

import { createContext, useContext } from 'react';
import type { AdminProfile } from '@/lib/supabase';

export interface NavCounts {
  vendors: number;
  cars: number;
  withdrawals: number;
  disputes: number;
  notifications: number;
}

export const AdminContext = createContext<{ admin: AdminProfile | null; counts: NavCounts; refreshCounts: () => void }>({
  admin: null,
  counts: { vendors: 0, cars: 0, withdrawals: 0, disputes: 0, notifications: 0 },
  refreshCounts: () => {},
});

export const useAdmin = () => useContext(AdminContext);
