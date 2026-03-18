'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transfersRes, productsRes, locationsRes] = await Promise.all([
        api.get('/transfers'),
        api.get('/products'),
        api.get('/locations')
      ]);
      setTransfers(transfersRes.data);
      setProducts(productsRes.data);
      setLocations(locationsRes.data);
      
      // Set default locations if available
      if (locationsRes.data.length >= 2) {
        setFormData(prev => ({
          ...prev,
          fromLocationId: locationsRes.data[0].id,
          toLocationId: locationsRes.data[1].id
        }));
      }
    } catch (error) {
      toast.error('Failed to load transfer data');
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
      setFormData({
        fromLocationId: locations[0]?.id || '',
        toLocationId: locations[1]?.id || '',
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
  const getAvailableVariants = () => {
    const variants = [];
    products.forEach(product => {
      product.variants.forEach(variant => {
        variants.push({
          id: variant.id,
          label: `${product.name} (${variant.location.name}) - Stock: ${variant.stockQuantity}`,
          locationId: variant.locationId
        });
      });
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
              {transfers.length === 0 ? (
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
                      {transfer.productVariant.product.name}
                      {transfer.productVariant.variantValue && (
                        <span className="block text-xs text-gray-500">
                          {transfer.productVariant.variantValue}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{transfer.fromLocation.name}</td>
                    <td className="px-4 py-3 text-gray-600 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      {transfer.toLocation.name}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-800">{transfer.quantity}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transfer.status)}
                        {getStatusBadge(transfer.status)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{transfer.transferredBy.username}</td>
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
                  <select
                    required
                    value={formData.productVariantId}
                    onChange={(e) => {
                      const variant = getAvailableVariants().find(v => v.id === e.target.value);
                      setFormData({
                        ...formData,
                        productVariantId: e.target.value,
                        fromLocationId: variant ? variant.locationId : ''
                      });
                    }}
                    className="input-field"
                  >
                    <option value="">Select Product at Source Location</option>
                    {getAvailableVariants().map(v => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
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