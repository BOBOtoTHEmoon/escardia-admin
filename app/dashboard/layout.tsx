'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import {
  LayoutDashboard,
  Users,
  Building2,
  Car,
  Calendar,
  DollarSign,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Vendors', href: '/dashboard/vendors', icon: Building2 },
  { name: 'Cars', href: '/dashboard/cars', icon: Car },
  { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
  { name: 'Transactions', href: '/dashboard/transactions', icon: DollarSign },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

// ✅ ADMIN PROFILES 
const ADMIN_PROFILES: { [email: string]: { name: string; role: string } } = {
  'admin@escardia.com': { name: 'Admin User', role: 'Super Admin' },
  'idowuoluwanifemi45@gmail.com': { name: 'Idowu Oluwanifemi CEO', role: 'Admin' },
  // Add more admins here
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  // ✅ GET CURRENT USER
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('Admin User');
  const [adminInitial, setAdminInitial] = useState('A');

  useEffect(() => {
    const user = auth.currentUser;
    if (user?.email) {
      const email = user.email;
      setAdminEmail(email);
      
      // Get profile from list or use email
      const profile = ADMIN_PROFILES[email];
      if (profile) {
        setAdminName(profile.name);
        setAdminInitial(profile.name[0].toUpperCase());
      } else {
        // Fallback: use email username
        const username = email.split('@')[0];
        const displayName = username.charAt(0).toUpperCase() + username.slice(1);
        setAdminName(displayName);
        setAdminInitial(username[0].toUpperCase());
      }
    }
  }, []);

  // ✅ LOGOUT HANDLER
  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await signOut(auth);
        router.push('/');
      } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-xl transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo.png" 
              alt="Escardia Logo" 
              className="h-8 w-8 object-contain"
              onError={(e) => {
                // Fallback if logo doesn't exist
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 hidden" />
            <span className="text-xl font-bold text-gray-900">Escardia</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-200 p-4">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {/* ✅ DYNAMIC PROFILE */}
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold text-sm">
                {adminInitial}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{adminName}</p>
                <p className="text-xs text-gray-500">{adminEmail}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}