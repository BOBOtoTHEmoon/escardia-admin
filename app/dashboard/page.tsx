'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import {
  Users,
  Building2,
  Car,
  DollarSign,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalVendors: number;
  totalCars: number;
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
}

interface RecentBooking {
  id: string;
  customerName: string;
  carBrand: string;
  carModel: string;
  status: string;
  duration: number;
  durationType: string;
}

interface RecentUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalVendors: 0,
    totalCars: 0,
    totalBookings: 0,
    activeBookings: 0,
    totalRevenue: 0,
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get users count
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;

      // Get vendors count
      const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
      const totalVendors = vendorsSnapshot.size;

      // Get cars count
      const carsSnapshot = await getDocs(collection(db, 'cars'));
      const totalCars = carsSnapshot.size;

      // Get bookings
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const totalBookings = bookingsSnapshot.size;

     // ✅ Get active bookings with proper date+time calculation
const { calculateBookingStatus } = await import('@/lib/bookingHelpers');

const allBookingsSnapshot = await getDocs(collection(db, 'bookings'));
let activeBookings = 0;

allBookingsSnapshot.forEach((doc) => {
  const booking = doc.data();
  const actualStatus = calculateBookingStatus(
    booking.startDate,
    booking.startTime,
    booking.endDate,
    booking.stopTime || booking.endTime
  );
  
  if (actualStatus === 'ongoing' || actualStatus === 'upcoming') {
    activeBookings++;
  }
});
      // Calculate total revenue
      let totalRevenue = 0;
      bookingsSnapshot.forEach((doc) => {
        const booking = doc.data();
        if (booking.status !== 'cancelled') {
          totalRevenue += booking.totalPrice || 0;
        }
      });

      // ✅ Get recent bookings (last 3)
      const recentBookingsQuery = query(
        collection(db, 'bookings'),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const recentBookingsSnapshot = await getDocs(recentBookingsQuery);
      const bookingsData: RecentBooking[] = recentBookingsSnapshot.docs.map((doc) => ({
        id: doc.id,
        customerName: doc.data().customerName || 'Unknown',
        carBrand: doc.data().carBrand || '',
        carModel: doc.data().carModel || '',
        status: doc.data().status || 'pending',
        duration: doc.data().duration || 0,
        durationType: doc.data().durationType || 'day',
      }));

      // ✅ Get recent users (last 3)
      const recentUsersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const recentUsersSnapshot = await getDocs(recentUsersQuery);
      const usersData: RecentUser[] = recentUsersSnapshot.docs.map((doc) => ({
        id: doc.id,
        email: doc.data().email || '',
        firstName: doc.data().firstName,
        lastName: doc.data().lastName,
        createdAt: doc.data().createdAt,
      }));

      setStats({
        totalUsers,
        totalVendors,
        totalCars,
        totalBookings,
        activeBookings,
        totalRevenue,
      });
      
      setRecentBookings(bookingsData);
      setRecentUsers(usersData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'bg-green-100 text-green-700';
      case 'upcoming':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Just now';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    } catch {
      return 'Just now';
    }
  };

  const statCards = [
    {
      name: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      name: 'Total Vendors',
      value: stats.totalVendors,
      icon: Building2,
      color: 'bg-purple-500',
      change: '+8%',
    },
    {
      name: 'Total Cars',
      value: stats.totalCars,
      icon: Car,
      color: 'bg-green-500',
      change: '+23%',
    },
    {
      name: 'Active Bookings',
      value: stats.activeBookings,
      icon: Calendar,
      color: 'bg-orange-500',
      change: '+5%',
    },
    {
      name: 'Total Bookings',
      value: stats.totalBookings,
      icon: TrendingUp,
      color: 'bg-pink-500',
      change: '+18%',
    },
    {
      name: 'Total Revenue',
      value: `₦${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-indigo-500',
      change: '+32%',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back! Here's what's happening with your platform today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="mt-2 flex items-center text-sm">
                    <span className="font-medium text-green-600">{stat.change}</span>
                    <span className="ml-2 text-gray-500">from last month</span>
                  </p>
                </div>
                <div className={`${stat.color} rounded-xl p-3 text-white`}>
                  <Icon className="h-8 w-8" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ✅ REAL Recent Bookings */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Bookings
          </h3>
          {recentBookings.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No bookings yet</p>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {booking.carBrand} {booking.carModel}
                    </p>
                    <p className="text-sm text-gray-500">
                      {booking.customerName} • {booking.duration} {booking.durationType}(s)
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ✅ REAL Recent Users */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            New Users
          </h3>
          {recentUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No users yet</p>
          ) : (
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-3 border-b border-gray-100 pb-3 last:border-0"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold">
                    {user.firstName?.[0] || user.email[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : 'New User'}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(user.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}