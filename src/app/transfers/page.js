'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, ArrowRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function TransfersPage() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    fromLocationId: '',
    toLocationId: '',
    productVariantId: '',
    quantity: 1
  });
  // Add these state variables
const [productSearchTerm, setProductSearchTerm] = useState('');
const [showDropdown, setShowDropdown] = useState(false);
const dropdownRef = useRef(null);

// Filter variants based on search term
const getFilteredVariants = () => {
  const allVariants = getAvailableVariants();
  
  if (!productSearchTerm) return allVariants;
  
  return allVariants.filter(variant => 
    variant.label.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    variant.productName.toLowerCase().includes(productSearchTerm.toLowerCase())
  );
};

// Close dropdown when clicking outside
useEffect(() => {
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowDropdown(false);
    }
  };
  
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

  useEffect(() => {
    fetchData();
  }, []);

const fetchData = async () => {
  try {
    const [transfersRes, productsRes, locationsRes] = await Promise.all([
      api.get('/transfers'),
      api.get('/products?limit=1000'), // Get all products without pagination
      api.get('/locations')
    ]);
    
    // Debug logging
    console.log('Products response structure:', productsRes.data);
    
    // Extract the products array correctly - it might be in data.data or directly in data
    let productsData = [];
    if (Array.isArray(productsRes.data)) {
      // If response is directly an array
      productsData = productsRes.data;
    } else if (productsRes.data && Array.isArray(productsRes.data.data)) {
      // If response has a data property containing the array (like your API returns)
      productsData = productsRes.data.data;
    } else if (productsRes.data && Array.isArray(productsRes.data.products)) {
      // Alternative structure
      productsData = productsRes.data.products;
    } else {
      console.error('Unexpected products response structure:', productsRes.data);
      productsData = [];
    }
    
    console.log('Products data extracted:', productsData);
    
    setTransfers(Array.isArray(transfersRes.data) ? transfersRes.data : []);
    setProducts(productsData);
    setLocations(Array.isArray(locationsRes.data) ? locationsRes.data : []);
    
    // Set default locations if available
    if (Array.isArray(locationsRes.data) && locationsRes.data.length >= 2) {
      setFormData(prev => ({
        ...prev,
        fromLocationId: locationsRes.data[0].id,
        toLocationId: locationsRes.data[1].id
      }));
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    toast.error('Failed to load transfer data');
    setTransfers([]);
    setProducts([]);
    setLocations([]);
  } finally {
    setLoading(false);
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (formData.fromLocationId === formData.toLocationId) {
    toast.error('Source and destination locations must be different');
    return;
  }

  try {
    await api.post('/transfers', formData);
    toast.success('Transfer request created successfully');
    setShowModal(false);
    
    // Fix: Only set default locations if locations array exists and has items
    setFormData({
      fromLocationId: locations && locations.length > 0 ? locations[0].id : '',
      toLocationId: locations && locations.length > 1 ? locations[1].id : '',
      productVariantId: '',
      quantity: 1
    });
    fetchData();
  } catch (error) {
    toast.error(error.response?.data?.error || 'Failed to create transfer');
  }
};

  const handleComplete = async (id) => {
    if (!confirm('Confirm completion of this transfer? Stock will be updated.')) return;
    
    try {
      await api.put(`/transfers/${id}/complete`);
      toast.success('Transfer completed and stock updated');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to complete transfer');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'COMPLETED': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'CANCELLED': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  // Filter products to only show those with variants for the dropdown
// Update your getAvailableVariants function with proper safety checks
const getAvailableVariants = () => {
  const variants = [];
  
  // Add safety check
  if (!Array.isArray(products)) {
    console.error('Products is not an array:', products);
    return variants;
  }
  
  products.forEach(product => {
    // Check if product has variants and it's an array
    if (product && Array.isArray(product.variants)) {
      product.variants.forEach(variant => {
        // Ensure variant and location exist
        if (variant && variant.id) {
          const locationName = variant.location?.name || 'Unknown Location';
          const stockQty = variant.stockQuantity || 0;
          
          variants.push({
            id: variant.id,
            label: `${product.name || 'Unknown Product'} (${locationName}) - Stock: ${stockQty}`,
            locationId: variant.locationId,
            productId: product.id,
            productName: product.name,
            stockQuantity: stockQty
          });
        }
      });
    }
  });
  
  return variants;
};

  if (loading) return <div className="p-6">Loading transfers...</div>;

  return (
    <Sidebar>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Stock Transfers</h1>
          {user.role === 'ADMIN' && (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New Transfer
            </button>
          )}
        </div>

        {/* Transfers List */}
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Product</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">From</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">To</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Qty</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">By</th>
                {user.role === 'ADMIN' && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                )}
              </tr>
            </thead>
<tbody className="divide-y">
  {!Array.isArray(transfers) || transfers.length === 0 ? (
    <tr>
      <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
        No stock transfers recorded yet.
      </td>
    </tr>
  ) : (
    transfers.map((transfer) => (
      <tr key={transfer.id} className="hover:bg-gray-50">
        <td className="px-4 py-3 text-gray-600">
          {new Date(transfer.createdAt).toLocaleDateString()}
        </td>
        <td className="px-4 py-3 font-medium text-gray-800">
          {transfer.productVariant?.product?.name || 'Unknown Product'}
          {transfer.productVariant?.variantValue && (
            <span className="block text-xs text-gray-500">
              {transfer.productVariant.variantValue}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-gray-600">
          {transfer.fromLocation?.name || 'Unknown Location'}
        </td>
        <td className="px-4 py-3 text-gray-600 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-gray-400" />
          {transfer.toLocation?.name || 'Unknown Location'}
        </td>
        <td className="px-4 py-3 font-bold text-gray-800">{transfer.quantity}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(transfer.status)}
            {getStatusBadge(transfer.status)}
          </div>
        </td>
        <td className="px-4 py-3 text-gray-600">
          {transfer.transferredBy?.username || 'Unknown'}
        </td>
        {user.role === 'ADMIN' && (
          <td className="px-4 py-3">
            {transfer.status === 'PENDING' && (
              <button
                onClick={() => handleComplete(transfer.id)}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                Complete
              </button>
            )}
          </td>
        )}
      </tr>
    ))
  )}
</tbody>
          </table>
        </div>

        {/* New Transfer Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Create Stock Transfer</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product & Source Location *</label>
<div className="relative" ref={dropdownRef}>
  
  {/* Search Input */}
  <div 
    className="input-field cursor-pointer flex justify-between items-center"
    onClick={() => setShowDropdown(!showDropdown)}
  >
    <span className={formData.productVariantId ? 'text-gray-900' : 'text-gray-400'}>
      {formData.productVariantId 
        ? getAvailableVariants().find(v => v.id === formData.productVariantId)?.label 
        : 'Select Product at Source Location'}
    </span>
    <svg 
      className={`w-5 h-5 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </div>
  
  {/* Dropdown */}
  {showDropdown && (
    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
      {/* Search Input */}
      <div className="p-2 border-b">
        <input
          type="text"
          placeholder="Search products..."
          value={productSearchTerm}
          onChange={(e) => setProductSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>
      
      {/* Options List */}
      <div className="overflow-y-auto max-h-64">
        {getFilteredVariants().length === 0 ? (
          <div className="px-4 py-3 text-gray-500 text-center">
            No products found
          </div>
        ) : (
          getFilteredVariants().map(variant => (
            <div
              key={variant.id}
              className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
              onClick={() => {
                setFormData({
                  ...formData,
                  productVariantId: variant.id,
                  fromLocationId: variant.locationId
                });
                setShowDropdown(false);
                setProductSearchTerm('');
              }}
            >
              <div className="font-medium">{variant.productName}</div>
              <div className="text-sm text-gray-500">
                Location: {variant.label.split('(')[1]?.split(')')[0] || 'Unknown'}
              </div>
              <div className="text-xs text-gray-400">
                Stock: {variant.stockQuantity} units
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )}
</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Selecting a product automatically sets the "From" location.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Location *</label>
                  <input
                    type="text"
                    value={locations.find(l => l.id === formData.fromLocationId)?.name || ''}
                    disabled
                    className="input-field bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Location *</label>
                  <select
                    required
                    value={formData.toLocationId}
                    onChange={(e) => setFormData({...formData, toLocationId: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select Destination</option>
                    {locations.filter(l => l.id !== formData.fromLocationId).map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                    className="input-field"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1">Create Transfer</button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
    </Sidebar>
  );
}