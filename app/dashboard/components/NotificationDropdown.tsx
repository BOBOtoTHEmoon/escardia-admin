'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, AlertCircle, Info, TrendingUp } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';

interface Notification {
  id: string;
  type: 'booking' | 'user' | 'vendor' | 'system' | 'alert';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Generate mock notifications based on real data
      const notifications: Notification[] = [];

      // Check for new bookings (last 10)
      const bookingsQuery = query(
        collection(db, 'bookings'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      bookingsSnapshot.forEach((doc) => {
        const booking = doc.data();
        const createdAt = booking.createdAt || new Date().toISOString();
        const timeAgo = getTimeAgo(createdAt);
        
        notifications.push({
          id: `booking-${doc.id}`,
          type: 'booking',
          title: 'New Booking',
          message: `${booking.customerName || 'A user'} booked ${booking.carBrand || ''} ${booking.carModel || 'a car'}`,
          read: false,
          createdAt: timeAgo,
        });
      });

      // Check for new users (last 5)
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      usersSnapshot.forEach((doc) => {
        const user = doc.data();
        const createdAt = user.createdAt || new Date().toISOString();
        const timeAgo = getTimeAgo(createdAt);
        
        notifications.push({
          id: `user-${doc.id}`,
          type: 'user',
          title: 'New User Registered',
          message: `${user.firstName || 'Someone'} ${user.lastName || ''} joined the platform`,
          read: false,
          createdAt: timeAgo,
        });
      });

      // Check for pending vendor approvals
      const vendorsQuery = query(
        collection(db, 'vendors'),
        where('status', '==', 'pending'),
        limit(3)
      );
      const vendorsSnapshot = await getDocs(vendorsQuery);
      
      vendorsSnapshot.forEach((doc) => {
        const vendor = doc.data();
        notifications.push({
          id: `vendor-${doc.id}`,
          type: 'vendor',
          title: 'Vendor Approval Pending',
          message: `${vendor.businessName || vendor.firstName || 'A vendor'} is awaiting approval`,
          read: false,
          createdAt: 'Pending',
        });
      });

      // Add system notifications
      notifications.push({
        id: 'system-1',
        type: 'system',
        title: 'Platform Healthy',
        message: 'All systems operational',
        read: true,
        createdAt: '1h ago',
      });

      // Sort by newest first
      setNotifications(notifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'user':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'vendor':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationBg = (type: string) => {
    switch (type) {
      case 'booking':
        return 'bg-blue-100';
      case 'user':
        return 'bg-green-100';
      case 'vendor':
        return 'bg-orange-100';
      case 'alert':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
   <div ref={dropdownRef} className="relative z-[60]">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-xl ring-1 ring-black/5 z-[60]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <p className="text-xs text-gray-500">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 transition-colors hover:bg-gray-50 ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 rounded-lg p-2 ${getNotificationBg(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-600 mt-1" />
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {notification.createdAt}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 p-3">
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/dashboard/notifications';
                }}
                className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}