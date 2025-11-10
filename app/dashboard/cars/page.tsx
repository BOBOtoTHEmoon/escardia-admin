'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Search, Filter, Eye, Trash2, Ban, CheckCircle, Car as CarIcon } from 'lucide-react';

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
  available?: boolean;
  featured?: boolean;
  createdAt?: string;
}

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [filteredCars, setFilteredCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadCars();
  }, []);

  useEffect(() => {
    // Filter cars based on search
    if (searchQuery.trim() === '') {
      setFilteredCars(cars);
    } else {
      const filtered = cars.filter(
        (car) =>
          car.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          car.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          car.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          car.year?.includes(searchQuery)
      );
      setFilteredCars(filtered);
    }
  }, [searchQuery, cars]);

  const loadCars = async () => {
    try {
      setLoading(true);
      const carsQuery = query(collection(db, 'cars'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(carsQuery);

      const carsData: Car[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Car[];

      setCars(carsData);
      setFilteredCars(carsData);
    } catch (error) {
      console.error('Error loading cars:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const availableCars = cars.filter((c) => c.available !== false).length;
  const featuredCars = cars.filter((c) => c.featured === true).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cars</h1>
          <p className="mt-2 text-gray-600">
            Manage all cars on your platform ({filteredCars.length} total)
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cars</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{cars.length}</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <CarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{availableCars}</p>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by brand, model, location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Cars Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCars.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <p className="text-gray-500">
              {searchQuery ? 'No cars found matching your search' : 'No cars yet'}
            </p>
          </div>
        ) : (
          filteredCars.map((car) => (
            <div
              key={car.id}
              className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5 transition-shadow hover:shadow-md"
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
                
                {/* Featured Badge */}
                {car.featured && (
                  <div className="absolute top-2 right-2 rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white">
                    Featured
                  </div>
                )}
                
                {/* Availability Badge */}
                <div className={`absolute top-2 left-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  car.available !== false ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {car.available !== false ? 'Available' : 'Disabled'}
                </div>
              </div>

              {/* Car Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {car.brand} {car.model}
                </h3>
                <p className="text-sm text-gray-500">{car.year}</p>
                
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

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCar(car);
                      setShowModal(true);
                    }}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Eye className="inline h-4 w-4 mr-1" />
                    View
                  </button>
                  
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
                  
                  <button
                    onClick={() => handleDeleteCar(car.id)}
                    className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
              <h2 className="text-2xl font-bold text-gray-900">Car Details</h2>
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
                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedCar.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`${selectedCar.brand} ${selectedCar.model} ${index + 1}`}
                      className="h-48 w-full rounded-lg object-cover"
                    />
                  ))}
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
                  <div>
                    <p className="text-sm text-gray-500">Vendor ID</p>
                    <p className="font-mono text-sm">{selectedCar.vendorId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium">
                      {selectedCar.available !== false ? (
                        <span className="text-green-600">Available</span>
                      ) : (
                        <span className="text-red-600">Disabled</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
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
                <button
                  onClick={() => {
                    handleDeleteCar(selectedCar.id);
                    setShowModal(false);
                  }}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700"
                >
                  Delete Car
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}