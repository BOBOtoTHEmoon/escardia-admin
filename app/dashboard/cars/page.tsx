'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { Search, Eye, Trash2, Ban, CheckCircle, Car as CarIcon, XCircle, Clock, Filter } from 'lucide-react';

interface Car {
  id: string;
  brand: string;
  model: string;
  year: string;
  pricePerDay: number;
  pricePerHour: number;
  location: string;
  transmission: string;
  seats: number;
  doors: number;
  photos: string[];
  vendorId: string;
  vendorName?: string;
  available?: boolean;
  featured?: boolean;
  status?: 'available' | 'booked' | 'maintenance'; // This is for availability
  approvalStatus?: 'pending' | 'approved' | 'rejected'; // ✅ FIXED: This is for admin approval
  rejectionReason?: string;
  createdAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

interface Vendor {
  id: string;
  businessName?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
}

type TabType = 'pending' | 'approved' | 'rejected' | 'all';

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [vendors, setVendors] = useState<Map<string, Vendor>>(new Map());
  const [filteredCars, setFilteredCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [carToReject, setCarToReject] = useState<Car | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCars();
  }, [searchQuery, cars, activeTab]);

  const filterCars = () => {
    let filtered = cars;

    // Filter by tab - ✅ FIXED: Using approvalStatus
    if (activeTab !== 'all') {
      filtered = filtered.filter((car) => {
        const carApprovalStatus = car.approvalStatus || 'pending'; // Default to pending if no approvalStatus
        return carApprovalStatus === activeTab;
      });
    }

    // Filter by search
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(
        (car) =>
          car.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          car.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          car.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          car.year?.includes(searchQuery) ||
          car.vendorName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCars(filtered);
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Load vendors first
      const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
      const vendorsMap = new Map<string, Vendor>();
      
      vendorsSnapshot.forEach((doc) => {
        vendorsMap.set(doc.id, {
          id: doc.id,
          ...doc.data(),
        } as Vendor);
      });
      setVendors(vendorsMap);

      // Load all cars
      const carsQuery = query(collection(db, 'cars'), orderBy('createdAt', 'desc'));
      const carsSnapshot = await getDocs(carsQuery);

      const carsData: Car[] = carsSnapshot.docs.map((doc) => {
        const data = doc.data();
        const vendor = vendorsMap.get(data.vendorId);
        
        return {
          id: doc.id,
          ...data,
          approvalStatus: data.approvalStatus || 'pending', // ✅ FIXED: Default to pending
          vendorName: vendor?.businessName || `${vendor?.firstName || ''} ${vendor?.lastName || ''}`.trim() || 'Unknown Vendor',
        } as Car;
      });

      setCars(carsData);
      setFilteredCars(carsData.filter(c => (c.approvalStatus || 'pending') === 'pending'));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Approve car - updates approvalStatus field
  const handleApproveCar = async (car: Car) => {
    if (!confirm(`Approve "${car.brand} ${car.model}"? This car will be visible to users.`)) return;

    try {
      await updateDoc(doc(db, 'cars', car.id), {
        approvalStatus: 'approved', // ✅ FIXED
        approvedAt: new Date().toISOString(),
      });

      setCars(cars.map((c) =>
        c.id === car.id ? { ...c, approvalStatus: 'approved', approvedAt: new Date().toISOString() } : c
      ));

      alert(`✅ "${car.brand} ${car.model}" approved! It's now visible to users.`);
    } catch (error) {
      console.error('Error approving car:', error);
      alert('Failed to approve car');
    }
  };

  // ✅ FIXED: Reject car - updates approvalStatus field
  const handleRejectCar = async () => {
    if (!carToReject) return;

    try {
      await updateDoc(doc(db, 'cars', carToReject.id), {
        approvalStatus: 'rejected', // ✅ FIXED
        rejectionReason: rejectReason || 'Does not meet platform standards',
        rejectedAt: new Date().toISOString(),
      });

      setCars(cars.map((c) =>
        c.id === carToReject.id 
          ? { ...c, approvalStatus: 'rejected', rejectionReason: rejectReason, rejectedAt: new Date().toISOString() } 
          : c
      ));

      alert(`❌ "${carToReject.brand} ${carToReject.model}" rejected.`);
      setShowRejectModal(false);
      setRejectReason('');
      setCarToReject(null);
    } catch (error) {
      console.error('Error rejecting car:', error);
      alert('Failed to reject car');
    }
  };

  const openRejectModal = (car: Car) => {
    setCarToReject(car);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleDeleteCar = async (carId: string) => {
    if (!confirm('Are you sure you want to delete this car? This action cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'cars', carId));
      setCars(cars.filter((c) => c.id !== carId));
      alert('Car deleted successfully!');
    } catch (error) {
      console.error('Error deleting car:', error);
      alert('Failed to delete car');
    }
  };

  const handleToggleFeatured = async (carId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'cars', carId), {
        featured: !currentStatus,
      });

      setCars(cars.map((c) =>
        c.id === carId ? { ...c, featured: !currentStatus } : c
      ));

      alert(`Car ${!currentStatus ? 'featured' : 'unfeatured'} successfully!`);
    } catch (error) {
      console.error('Error updating car:', error);
      alert('Failed to update car');
    }
  };

  const handleToggleAvailability = async (carId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'cars', carId), {
        available: !currentStatus,
      });

      setCars(cars.map((c) =>
        c.id === carId ? { ...c, available: !currentStatus } : c
      ));

      alert(`Car ${!currentStatus ? 'enabled' : 'disabled'} successfully!`);
    } catch (error) {
      console.error('Error updating car:', error);
      alert('Failed to update car');
    }
  };

  // ✅ FIXED: Get status badge based on approvalStatus
  const getStatusBadge = (approvalStatus: string | undefined) => {
    const s = approvalStatus || 'pending';
    switch (s) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700">
            <Clock className="h-3 w-3" />
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

  // ✅ FIXED: Stats based on approvalStatus
  const pendingCars = cars.filter((c) => (c.approvalStatus || 'pending') === 'pending').length;
  const approvedCars = cars.filter((c) => c.approvalStatus === 'approved').length;
  const rejectedCars = cars.filter((c) => c.approvalStatus === 'rejected').length;
  const featuredCars = cars.filter((c) => c.featured === true).length;

  const tabs: { key: TabType; label: string; count: number; color: string }[] = [
    { key: 'pending', label: 'Pending Approval', count: pendingCars, color: 'yellow' },
    { key: 'approved', label: 'Approved', count: approvedCars, color: 'green' },
    { key: 'rejected', label: 'Rejected', count: rejectedCars, color: 'red' },
    { key: 'all', label: 'All Cars', count: cars.length, color: 'blue' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Car Management</h1>
          <p className="mt-2 text-gray-600">
            Review and approve car listings before they go live
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
              <p className="mt-1 text-2xl font-bold text-yellow-600">{pendingCars}</p>
            </div>
            <div className="rounded-lg bg-yellow-100 p-3">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{approvedCars}</p>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{rejectedCars}</p>
            </div>
            <div className="rounded-lg bg-red-100 p-3">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Featured</p>
              <p className="mt-1 text-2xl font-bold text-purple-600">{featuredCars}</p>
            </div>
            <div className="rounded-lg bg-purple-100 p-3">
              <CarIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? `border-${tab.color}-600 text-${tab.color}-600`
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
              style={{
                borderColor: activeTab === tab.key 
                  ? tab.color === 'yellow' ? '#ca8a04' 
                  : tab.color === 'green' ? '#16a34a'
                  : tab.color === 'red' ? '#dc2626'
                  : '#2563eb'
                  : undefined,
                color: activeTab === tab.key
                  ? tab.color === 'yellow' ? '#ca8a04'
                  : tab.color === 'green' ? '#16a34a'
                  : tab.color === 'red' ? '#dc2626'
                  : '#2563eb'
                  : undefined,
              }}
            >
              {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                activeTab === tab.key
                  ? tab.color === 'yellow' ? 'bg-yellow-100 text-yellow-700'
                  : tab.color === 'green' ? 'bg-green-100 text-green-700'
                  : tab.color === 'red' ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by brand, model, location, vendor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Cars Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCars.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <CarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">
              {searchQuery 
                ? 'No cars found matching your search' 
                : activeTab === 'pending'
                ? 'No cars pending approval 🎉'
                : `No ${activeTab} cars`
              }
            </p>
          </div>
        ) : (
          filteredCars.map((car) => (
            <div
              key={car.id}
              className={`overflow-hidden rounded-xl bg-white shadow-sm ring-1 transition-shadow hover:shadow-md ${
                (car.approvalStatus || 'pending') === 'pending' 
                  ? 'ring-yellow-300' 
                  : car.approvalStatus === 'rejected'
                  ? 'ring-red-200'
                  : 'ring-gray-900/5'
              }`}
            >
              {/* Car Image */}
              <div className="relative h-48 overflow-hidden bg-gray-100">
                {car.photos && car.photos[0] ? (
                  <img
                    src={car.photos[0]}
                    alt={`${car.brand} ${car.model}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <CarIcon className="h-16 w-16 text-gray-400" />
                  </div>
                )}

                {/* Status Badge - ✅ FIXED: Using approvalStatus */}
                <div className="absolute top-2 left-2">
                  {getStatusBadge(car.approvalStatus)}
                </div>

                {/* Featured Badge */}
                {car.featured && (
                  <div className="absolute top-2 right-2 rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white">
                    Featured
                  </div>
                )}
              </div>

              {/* Car Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {car.brand} {car.model}
                </h3>
                <p className="text-sm text-gray-500">{car.year}</p>

                {/* Vendor Info */}
                <p className="mt-1 text-sm text-blue-600">
                  By: {car.vendorName}
                </p>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-500">Per Day</p>
                    <p className="font-semibold text-gray-900">
                      ₦{car.pricePerDay?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Per Hour</p>
                    <p className="font-semibold text-gray-900">
                      ₦{car.pricePerHour?.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
                  <span>{car.seats} seats</span>
                  <span>•</span>
                  <span>{car.transmission}</span>
                  <span>•</span>
                  <span>{car.location}</span>
                </div>

                {/* Rejection Reason - ✅ FIXED: Using approvalStatus */}
                {car.approvalStatus === 'rejected' && car.rejectionReason && (
                  <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                    <strong>Reason:</strong> {car.rejectionReason}
                  </div>
                )}

                {/* Actions based on approvalStatus - ✅ FIXED */}
                <div className="mt-4 flex gap-2">
                  {/* View Button - Always shown */}
                  <button
                    onClick={() => {
                      setSelectedCar(car);
                      setShowModal(true);
                    }}
                    className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    <Eye className="inline h-4 w-4 mr-1" />
                    View
                  </button>

                  {/* Pending: Show Approve/Reject */}
                  {(car.approvalStatus || 'pending') === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApproveCar(car)}
                        className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        <CheckCircle className="inline h-4 w-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => openRejectModal(car)}
                        className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                      >
                        <XCircle className="inline h-4 w-4 mr-1" />
                        Reject
                      </button>
                    </>
                  )}

                  {/* Approved: Show Feature/Disable/Delete */}
                  {car.approvalStatus === 'approved' && (
                    <>
                      <button
                        onClick={() => handleToggleFeatured(car.id, car.featured || false)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium ${
                          car.featured
                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={car.featured ? 'Unfeature' : 'Feature'}
                      >
                        ⭐
                      </button>
                      <button
                        onClick={() => handleToggleAvailability(car.id, car.available !== false)}
                        className="rounded-lg bg-orange-100 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-200"
                        title={car.available !== false ? 'Disable' : 'Enable'}
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {/* Rejected: Show Re-approve or Delete */}
                  {car.approvalStatus === 'rejected' && (
                    <>
                      <button
                        onClick={() => handleApproveCar(car)}
                        className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Re-approve
                      </button>
                      <button
                        onClick={() => handleDeleteCar(car.id)}
                        className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Car Details Modal */}
      {showModal && selectedCar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Car Details</h2>
                <div className="mt-1">{getStatusBadge(selectedCar.approvalStatus)}</div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Car Photos */}
              {selectedCar.photos && selectedCar.photos.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">Photos ({selectedCar.photos.length})</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedCar.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`${selectedCar.brand} ${selectedCar.model} ${index + 1}`}
                        className="h-48 w-full rounded-lg object-cover cursor-pointer hover:opacity-90"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Car Info */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Car Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Brand & Model</p>
                    <p className="font-medium">{selectedCar.brand} {selectedCar.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Year</p>
                    <p className="font-medium">{selectedCar.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Price Per Day</p>
                    <p className="font-medium">₦{selectedCar.pricePerDay?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Price Per Hour</p>
                    <p className="font-medium">₦{selectedCar.pricePerHour?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{selectedCar.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Transmission</p>
                    <p className="font-medium">{selectedCar.transmission}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Seats</p>
                    <p className="font-medium">{selectedCar.seats}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Doors</p>
                    <p className="font-medium">{selectedCar.doors}</p>
                  </div>
                </div>
              </div>

              {/* Vendor Info */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Vendor Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Vendor Name</p>
                    <p className="font-medium">{selectedCar.vendorName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vendor ID</p>
                    <p className="font-mono text-sm">{selectedCar.vendorId}</p>
                  </div>
                </div>
              </div>

              {/* Rejection Reason if rejected - ✅ FIXED */}
              {selectedCar.approvalStatus === 'rejected' && selectedCar.rejectionReason && (
                <div className="rounded-lg bg-red-50 p-4">
                  <h3 className="font-semibold text-red-800">Rejection Reason</h3>
                  <p className="mt-1 text-red-700">{selectedCar.rejectionReason}</p>
                </div>
              )}

              {/* Actions - ✅ FIXED: Using approvalStatus */}
              <div className="flex gap-3 pt-4 border-t">
                {(selectedCar.approvalStatus || 'pending') === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleApproveCar(selectedCar);
                        setShowModal(false);
                      }}
                      className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700"
                    >
                      <CheckCircle className="inline h-5 w-5 mr-2" />
                      Approve Car
                    </button>
                    <button
                      onClick={() => {
                        setShowModal(false);
                        openRejectModal(selectedCar);
                      }}
                      className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700"
                    >
                      <XCircle className="inline h-5 w-5 mr-2" />
                      Reject Car
                    </button>
                  </>
                )}

                {selectedCar.approvalStatus === 'approved' && (
                  <>
                    <button
                      onClick={() => {
                        handleToggleFeatured(selectedCar.id, selectedCar.featured || false);
                        setShowModal(false);
                      }}
                      className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 font-semibold text-white hover:bg-purple-700"
                    >
                      {selectedCar.featured ? 'Unfeature' : 'Feature'} Car
                    </button>
                    <button
                      onClick={() => {
                        handleToggleAvailability(selectedCar.id, selectedCar.available !== false);
                        setShowModal(false);
                      }}
                      className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white hover:bg-orange-700"
                    >
                      {selectedCar.available !== false ? 'Disable' : 'Enable'} Car
                    </button>
                  </>
                )}

                {selectedCar.approvalStatus === 'rejected' && (
                  <button
                    onClick={() => {
                      handleApproveCar(selectedCar);
                      setShowModal(false);
                    }}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700"
                  >
                    <CheckCircle className="inline h-5 w-5 mr-2" />
                    Re-approve Car
                  </button>
                )}

                <button
                  onClick={() => {
                    handleDeleteCar(selectedCar.id);
                    setShowModal(false);
                  }}
                  className="rounded-lg bg-red-100 px-4 py-2.5 font-semibold text-red-700 hover:bg-red-200"
                >
                  <Trash2 className="inline h-5 w-5 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && carToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Reject Car Listing</h2>
            <p className="mt-2 text-gray-600">
              Rejecting: <strong>{carToReject.brand} {carToReject.model}</strong>
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Rejection Reason (optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Poor image quality, incomplete information, car doesn't meet standards..."
                rows={4}
                className="mt-1 w-full rounded-lg border border-gray-300 p-3 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setCarToReject(null);
                  setRejectReason('');
                }}
                className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectCar}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700"
              >
                Reject Car
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}