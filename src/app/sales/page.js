'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Download, Search, Filter } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';

export default function SalesPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [locations, setLocations] = useState([]);
  const [page, setPage] = useState(1);
const [limit] = useState(10);
const [meta, setMeta] = useState(null);
// Add these states to your SalesPage component
const [editingSale, setEditingSale] = useState(null);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [editForm, setEditForm] = useState({
  customerName: '',
  customerPhone: '',
  paymentMethod: 'CASH',
  totalAmount: 0,
  saleDate: '',
  items: []
});



// Open edit modal with sale data
const openEditModal = (sale) => {
    if (user?.role !== 'ADMIN') {
    toast.error('Only admins can edit sales');
    return;
  }
  setEditingSale(sale);
  setEditForm({
    customerName: sale.customerName || '',
    customerPhone: sale.customerPhone || '',
    paymentMethod: sale.paymentMethod,
    totalAmount: sale.totalAmount,
    saleDate: new Date(sale.createdAt).toISOString().slice(0, 16), // datetime-local format
    items: sale.items.map(item => ({
      id: item.id,
      productVariantId: item.productVariantId,
      productName: item.productVariant.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal
    }))
  });
  setIsEditModalOpen(true);
};

// Handle form input changes
const handleEditFormChange = (field, value) => {
  setEditForm(prev => ({ ...prev, [field]: value }));
};

// Handle item quantity/price changes
const handleItemChange = (index, field, value) => {
  const newItems = [...editForm.items];
  newItems[index] = { ...newItems[index], [field]: value };
  
  // Recalculate subtotal and total
  newItems[index].subtotal = newItems[index].quantity * newItems[index].unitPrice;
  const newTotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
  
  setEditForm(prev => ({
    ...prev,
    items: newItems,
    totalAmount: newTotal
  }));
};

// Submit updated sale
const handleUpdateSale = async (e) => {
    if (user?.role !== 'ADMIN') {
    toast.error('Unauthorized: Only admins can update sales');
    return;
  }
  e.preventDefault();
  
  try {
    const response = await api.put(`/sales/${editingSale.id}`, {
      ...editForm,
      items: editForm.items.map(({ id, ...item }) => item) // remove local id if needed
    });
    
    toast.success('Sale updated successfully');
    setIsEditModalOpen(false);
    setEditingSale(null);
    fetchData(); // Refresh the sales list
  } catch (error) {
    console.error('Update error:', error);
    toast.error(error.response?.data?.error || 'Failed to update sale');
  }
};

  useEffect(() => {
    fetchData();
  }, [page]);

  const fetchData = async () => {
  try {
    setLoading(true);

    const [salesRes, locationsRes] = await Promise.all([
      api.get(`/sales?page=${page}&limit=${limit}`),
      api.get('/locations')
    ]);

    setSales(Array.isArray(salesRes.data.data) ? salesRes.data.data : []);
    setMeta(salesRes.data.meta);
    setLocations(locationsRes.data);

  } catch (error) {
    toast.error('Failed to load sales data');
  } finally {
    setLoading(false);
  }
};

  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLocation = filterLocation ? sale.locationId === filterLocation : true;
    
    return matchesSearch && matchesLocation;
  });

  const formatCurrency = (amount) => {
    return `KES ${parseFloat(amount).toLocaleString()}`;
  };

  const downloadReceipt = async (saleId, receiptNumber) => {
    try {
      const response = await api.get(`/sales/${saleId}`);
      // In a real scenario, you'd fetch the PDF blob here. 
      // For now, we'll just show a success message as the PDF was generated at sale time.
      toast.success(`Receipt ${receiptNumber} downloaded (simulated)`);
      
      // If your backend returns the PDF base64 in the GET request, you would do:
      // const pdfBlob = new Blob([Buffer.from(response.data.receipt, 'base64')], { type: 'application/pdf' });
      // const url = window.URL.createObjectURL(pdfBlob);
      // const link = document.createElement('a');
      // link.href = url;
      // link.download = `${receiptNumber}.pdf`;
      // link.click();
    } catch (error) {
      toast.error('Failed to download receipt');
    }
  };

  if (loading) return <div className="p-6">Loading sales history...</div>;

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  return (
    <Sidebar>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Sales History</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card bg-green-50 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="card bg-blue-50 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total Transactions</p>
            <p className="text-2xl font-bold text-blue-700">{sales.length}</p>
          </div>
          <div className="card bg-purple-50 border-l-4 border-purple-500">
            <p className="text-sm text-gray-600">Average Sale</p>
            <p className="text-2xl font-bold text-purple-700">
              {sales.length > 0 ? formatCurrency(totalRevenue / sales.length) : 'KES 0'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by Receipt # or Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="w-full md:w-64">
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="input-field"
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sales Table */}
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Receipt #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Location</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Payment</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Items</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total</th>
                {user?.role === 'ADMIN' && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    No sales found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm text-gray-800">{sale.receiptNumber}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(sale.createdAt).toLocaleDateString()} <br/>
                      <span className="text-xs text-gray-400">
                        {new Date(sale.createdAt).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{sale.location.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {sale.customerName || <span className="text-gray-400 italic">Walk-in</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        sale.paymentMethod === 'CASH' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{sale.items.length} items</td>
                    <td className="px-4 py-3 font-bold text-gray-800">
                      {formatCurrency(sale.totalAmount)}
                    </td>
    <td className="px-4 py-3">
    {/* <button
      onClick={() => downloadReceipt(sale.id, sale.receiptNumber)}
      className="text-primary-600 hover:text-primary-800 flex items-center gap-1 text-sm"
    >
      <Download className="w-4 h-4" />
      Receipt
    </button> */}

    {user?.role === 'ADMIN' && (
      <button
        onClick={() => openEditModal(sale)}
        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
        title="Edit Sale"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit
      </button>
    )}
</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="flex justify-between items-center mt-4">
            
  <button
    disabled={page === 1}
    onClick={() => setPage(prev => prev - 1)}
    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
  >
    Previous
  </button>

  <span className="text-sm text-gray-600">
    Page {meta?.page} of {meta?.lastPage}
  </span>

  <button
    disabled={page === meta?.lastPage}
    onClick={() => setPage(prev => prev + 1)}
    className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
  >
    Next
  </button>
</div>
        </div>
      </div>
    </div>
    {/* Edit Sale Modal */}
{isEditModalOpen && editingSale && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-800">Edit Sale #{editingSale.receiptNumber}</h3>
        <button 
          onClick={() => setIsEditModalOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      
      <form onSubmit={handleUpdateSale} className="p-6 space-y-4">
        {/* Customer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input
              type="text"
              value={editForm.customerName}
              onChange={(e) => handleEditFormChange('customerName', e.target.value)}
              className="input-field w-full"
              placeholder="Walk-in"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
            <input
              type="tel"
              value={editForm.customerPhone}
              onChange={(e) => handleEditFormChange('customerPhone', e.target.value)}
              className="input-field w-full"
              placeholder="+254..."
            />
          </div>
        </div>

        {/* Sale Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={editForm.paymentMethod}
              onChange={(e) => handleEditFormChange('paymentMethod', e.target.value)}
              className="input-field w-full"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="MPESA">M-Pesa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label>
            <input
              type="datetime-local"
              value={editForm.saleDate}
              onChange={(e) => handleEditFormChange('saleDate', e.target.value)}
              className="input-field w-full"
            />
          </div>
        </div>

        {/* Items Table */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-left w-20">Qty</th>
                  <th className="px-3 py-2 text-left w-24">Price</th>
                  <th className="px-3 py-2 text-left w-24">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {editForm.items.map((item, index) => (
                  <tr key={item.productVariantId || index}>
                    <td className="px-3 py-2">{item.productName}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-end pt-4 border-t">
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(editForm.totalAmount)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(false)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </Sidebar>
  );
}