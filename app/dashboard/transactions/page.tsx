'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Search, Download, DollarSign, TrendingUp, Calendar } from 'lucide-react';

interface Transaction {
  id: string;
  bookingId: string;
  userId: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  status: string;
  carModel: string;
  date: string;
  createdAt?: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    // Filter transactions
    if (searchQuery.trim() === '') {
      setFilteredTransactions(transactions);
    } else {
      const filtered = transactions.filter(
        (tx) =>
          tx.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.bookingId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.carModel?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTransactions(filtered);
    }
  }, [searchQuery, transactions]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      // Get all bookings (they represent transactions)
      const bookingsQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(bookingsQuery);

      const transactionsData: Transaction[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          bookingId: doc.id,
          userId: data.userId || '',
          customerName: data.customerName || 'Unknown',
          amount: data.totalPrice || 0,
          paymentMethod: data.paymentMethod || 'N/A',
          status: data.status === 'cancelled' ? 'Refunded' : 'Completed',
          carModel: `${data.carBrand || ''} ${data.carModel || ''}`.trim(),
          date: data.startDate || 'N/A',
          createdAt: data.createdAt,
        };
      });

      setTransactions(transactionsData);
      setFilteredTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Transaction ID', 'Customer', 'Car', 'Amount', 'Payment Method', 'Status', 'Date'];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      tx.customerName,
      tx.carModel,
      tx.amount,
      tx.paymentMethod,
      tx.status,
      tx.date,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const totalRevenue = transactions.reduce((sum, tx) => 
    tx.status !== 'Refunded' ? sum + tx.amount : sum, 0
  );
  const totalTransactions = transactions.length;
  const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-2 text-gray-600">
            View all payment transactions ({filteredTransactions.length} total)
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          <Download className="h-5 w-5" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                ₦{totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{totalTransactions}</p>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Transaction</p>
              <p className="mt-2 text-3xl font-bold text-purple-600">
                ₦{Math.round(avgTransaction).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-purple-100 p-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by customer, booking ID, or car..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Car
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-gray-500">
                      {searchQuery ? 'No transactions found' : 'No transactions yet'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-mono text-gray-900">
                        #{tx.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{tx.customerName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{tx.carModel}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        ₦{tx.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm capitalize text-gray-900">{tx.paymentMethod}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          tx.status === 'Completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {tx.date}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}