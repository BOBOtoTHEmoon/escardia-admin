'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { Search, Filter, Calendar, Car, User, DollarSign, Eye } from 'lucide-react';
import { calculateBookingStatus } from '@/lib/bookingHelpers';


interface Booking {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  carBrand: string;
  carModel: string;
  carYear: string;
  startDate: string;
  endDate: string;
  startTime: string;
  stopTime: string;
  pickupLocation: string;
  pickupMethod: string;
  rideMode: string;
  totalPrice: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  paymentMethod: string;
  durationType: string;
  duration: number;
  createdAt?: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    // Filter bookings
    let filtered = bookings;

    // Search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(
        (booking) =>
          booking.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.carBrand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.carModel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          booking.id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((booking) => booking.status === filterStatus);
    }

    setFilteredBookings(filtered);
  }, [searchQuery, filterStatus, bookings]);

 const loadBookings = async () => {
  try {
    setLoading(true);
    const bookingsQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(bookingsQuery);

    const bookingsData: Booking[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      
      // ✅ Calculate real-time status
      const actualStatus = calculateBookingStatus(
        data.startDate,
        data.startTime,
        data.endDate,
        data.stopTime || data.endTime
      );

      return {
        id: doc.id,
        ...data,
        status: actualStatus, 
      };
    }) as Booking[];

    setBookings(bookingsData);
    setFilteredBookings(bookingsData);
  } catch (error) {
    console.error('Error loading bookings:', error);
  } finally {
    setLoading(false);
  }
};

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return dateString;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      upcoming: 'bg-blue-100 text-blue-700',
      ongoing: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
    };

    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const totalRevenue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const upcomingCount = bookings.filter((b) => b.status === 'upcoming').length;
  const ongoingCount = bookings.filter((b) => b.status === 'ongoing').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="mt-2 text-gray-600">
            Manage all bookings on your platform ({filteredBookings.length} total)
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">
                ₦{totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Upcoming</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{upcomingCount}</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ongoing</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{ongoingCount}</p>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <Car className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="mt-1 text-2xl font-bold text-gray-600">{completedCount}</p>
            </div>
            <div className="rounded-lg bg-gray-100 p-3">
              <Calendar className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer, car, or booking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'upcoming', 'ongoing', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={`whitespace-nowrap rounded-lg px-4 py-2.5 font-medium ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Booking ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Car
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-gray-500">
                      {searchQuery || filterStatus !== 'all'
                        ? 'No bookings found matching your filters'
                        : 'No bookings yet'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-mono text-gray-900">
                        #{booking.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold">
                            {booking.customerName?.[0]?.toUpperCase() || 'U'}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{booking.customerName}</div>
                          <div className="text-sm text-gray-500">{booking.customerEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {booking.carBrand} {booking.carModel}
                      </div>
                      <div className="text-sm text-gray-500">{booking.carYear}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {formatDate(booking.startDate)}
                      </div>
                      <div className="text-sm text-gray-500">
                        to {formatDate(booking.endDate)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        ₦{(booking.totalPrice || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {booking.duration} {booking.durationType}(s)
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowModal(true);
                        }}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                        title="View details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Modal */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Booking ID & Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Booking ID</p>
                  <p className="font-mono font-medium">#{selectedBooking.id}</p>
                </div>
                {getStatusBadge(selectedBooking.status)}
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Customer Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{selectedBooking.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedBooking.customerEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{selectedBooking.customerPhone}</p>
                  </div>
                </div>
              </div>

              {/* Car Info */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Car Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Car</p>
                    <p className="font-medium">
                      {selectedBooking.carBrand} {selectedBooking.carModel}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Year</p>
                    <p className="font-medium">{selectedBooking.carYear}</p>
                  </div>
                </div>
              </div>

              {/* Trip Details */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Trip Details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Start Date & Time</p>
                    <p className="font-medium">
                      {selectedBooking.startDate} at {selectedBooking.startTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date & Time</p>
                    <p className="font-medium">
                      {selectedBooking.endDate} at {selectedBooking.stopTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-medium">
                      {selectedBooking.duration} {selectedBooking.durationType}(s)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ride Mode</p>
                    <p className="font-medium capitalize">{selectedBooking.rideMode}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-500">Pickup Location</p>
                    <p className="font-medium">{selectedBooking.pickupLocation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pickup Method</p>
                    <p className="font-medium capitalize">{selectedBooking.pickupMethod}</p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Payment Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ₦{selectedBooking.totalPrice.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium capitalize">{selectedBooking.paymentMethod}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}