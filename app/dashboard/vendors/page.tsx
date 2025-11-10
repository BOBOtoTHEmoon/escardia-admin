'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Search, Filter, CheckCircle, XCircle, Eye, Ban, Trash2, Building2 } from 'lucide-react';

interface Vendor {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  businessName?: string;
  businessAddress?: string;
  cacNumber?: string;
  nin?: string;
  idType?: string;
  idFront?: string;
  idBack?: string;
  proofOfAddress?: string;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    // Filter vendors based on search and status
    let filtered = vendors;

    // Search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(
        (vendor) =>
          vendor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          vendor.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          vendor.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          vendor.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          vendor.phoneNumber?.includes(searchQuery)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((vendor) => vendor.status === filterStatus);
    }

    setFilteredVendors(filtered);
  }, [searchQuery, filterStatus, vendors]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const vendorsQuery = query(collection(db, 'vendors'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(vendorsQuery);

      const vendorsData: Vendor[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || 'pending', // Default to pending if not set
      })) as Vendor[];

      setVendors(vendorsData);
      setFilteredVendors(vendorsData);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveVendor = async (vendorId: string) => {
    if (!confirm('Approve this vendor?')) return;

    try {
      await updateDoc(doc(db, 'vendors', vendorId), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
      });

      setVendors(
        vendors.map((v) => (v.id === vendorId ? { ...v, status: 'approved' as const } : v))
      );
      alert('Vendor approved successfully!');
    } catch (error) {
      console.error('Error approving vendor:', error);
      alert('Failed to approve vendor');
    }
  };

  const handleRejectVendor = async (vendorId: string) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    try {
      await updateDoc(doc(db, 'vendors', vendorId), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || 'No reason provided',
      });

      setVendors(
        vendors.map((v) => (v.id === vendorId ? { ...v, status: 'rejected' as const } : v))
      );
      alert('Vendor rejected');
    } catch (error) {
      console.error('Error rejecting vendor:', error);
      alert('Failed to reject vendor');
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'vendors', vendorId));
      setVendors(vendors.filter((v) => v.id !== vendorId));
      alert('Vendor deleted successfully!');
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Failed to delete vendor');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const pendingCount = vendors.filter((v) => v.status === 'pending').length;
  const approvedCount = vendors.filter((v) => v.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
          <p className="mt-2 text-gray-600">
            Manage vendor applications and accounts ({filteredVendors.length} total)
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
              <p className="mt-1 text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <div className="rounded-lg bg-yellow-100 p-3">
              <Building2 className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Vendors</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{vendors.length}</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <Building2 className="h-6 w-6 text-blue-600" />
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
            placeholder="Search by name, email, business..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`rounded-lg px-4 py-2.5 font-medium ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`rounded-lg px-4 py-2.5 font-medium ${
              filterStatus === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`rounded-lg px-4 py-2.5 font-medium ${
              filterStatus === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Approved
          </button>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-gray-500">
                      {searchQuery || filterStatus !== 'all'
                        ? 'No vendors found matching your filters'
                        : 'No vendors yet'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white font-semibold">
                            {vendor.firstName?.[0] || vendor.email?.[0]?.toUpperCase() || 'V'}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">
                            {vendor.firstName && vendor.lastName
                              ? `${vendor.firstName} ${vendor.lastName}`
                              : 'No name'}
                          </div>
                          <div className="text-sm text-gray-500">{vendor.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {vendor.businessName || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {vendor.cacNumber ? `CAC: ${vendor.cacNumber}` : 'No CAC'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900">{vendor.phoneNumber || 'N/A'}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatusBadge(vendor.status)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(vendor.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setShowModal(true);
                          }}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                          title="View details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>

                        {vendor.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveVendor(vendor.id)}
                              className="rounded-lg p-2 text-green-600 hover:bg-green-50"
                              title="Approve vendor"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleRejectVendor(vendor.id)}
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                              title="Reject vendor"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleDeleteVendor(vendor.id)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          title="Delete vendor"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Details Modal */}
      {showModal && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Vendor Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Personal Info */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Personal Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium">
                      {selectedVendor.firstName} {selectedVendor.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedVendor.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{selectedVendor.phoneNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">NIN</p>
                    <p className="font-medium">{selectedVendor.nin || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Business Info */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Business Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Business Name</p>
                    <p className="font-medium">{selectedVendor.businessName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">CAC Number</p>
                    <p className="font-medium">{selectedVendor.cacNumber || 'N/A'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-500">Business Address</p>
                    <p className="font-medium">{selectedVendor.businessAddress || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Documents</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedVendor.idFront && (
                    <div>
                      <p className="mb-2 text-sm text-gray-500">ID Front</p>
                      <img
                        src={selectedVendor.idFront}
                        alt="ID Front"
                        className="h-32 w-full rounded-lg object-cover"
                      />
                    </div>
                  )}
                  {selectedVendor.idBack && (
                    <div>
                      <p className="mb-2 text-sm text-gray-500">ID Back</p>
                      <img
                        src={selectedVendor.idBack}
                        alt="ID Back"
                        className="h-32 w-full rounded-lg object-cover"
                      />
                    </div>
                  )}
                  {selectedVendor.proofOfAddress && (
                    <div className="sm:col-span-2">
                      <p className="mb-2 text-sm text-gray-500">Proof of Address</p>
                      <img
                        src={selectedVendor.proofOfAddress}
                        alt="Proof of Address"
                        className="h-32 w-full rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {selectedVendor.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      handleApproveVendor(selectedVendor.id);
                      setShowModal(false);
                    }}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700"
                  >
                    Approve Vendor
                  </button>
                  <button
                    onClick={() => {
                      handleRejectVendor(selectedVendor.id);
                      setShowModal(false);
                    }}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700"
                  >
                    Reject Vendor
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}