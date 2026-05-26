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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [locations, setLocations] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [meta, setMeta] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userLocationId, setUserLocationId] = useState(null);
  const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');
  
  // Summary totals state
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    averageSale: 0
  });
  
  // Edit states
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



  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Reset page when location filter changes
  useEffect(() => {
    setPage(1);
  }, [filterLocation]);

  useEffect(() => {
    if (user) {
      setIsAdmin(user.role === 'ADMIN');
      setUserLocationId(user.locationId);
      if (user.role !== 'ADMIN' && user.locationId) {
        setFilterLocation(user.locationId);
      }
    }
  }, [user]);
useEffect(() => {
  if (user === undefined) return;
  fetchData();
  fetchSummary();
}, [page, debouncedSearch, filterLocation, startDate, endDate, user]);

const fetchData = async () => {
  try {
    setLoading(true);
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (debouncedSearch) {
      params.append('search', debouncedSearch);
    }
    
    // ✅ Add date filters
    if (startDate) {
      params.append('startDate', new Date(startDate).toISOString());
    }
    if (endDate) {
      // Include the entire end day (up to 23:59:59)
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      params.append('endDate', endOfDay.toISOString());
    }
    
    // let locationToFilter = filterLocation;
    // if (!isAdmin && userLocationId) {
    //   locationToFilter = userLocationId;
    // }
    let locationToFilter = filterLocation;
    if (user?.role !== 'ADMIN' && user?.locationId) {
      locationToFilter = user.locationId;
    }
    if (locationToFilter) {
      params.append('locationId', locationToFilter);
    }

    const salesRes = await api.get(`/sales?${params.toString()}`);
    const locationsRes = await api.get('/locations');

    setSales(Array.isArray(salesRes.data.data) ? salesRes.data.data : []);
    setMeta(salesRes.data.meta);
    setLocations(locationsRes.data);
    
  } catch (error) {
    toast.error('Failed to load sales data');
    console.error(error);
  } finally {
    setLoading(false);
  }
};

  // Add this function with your other handlers
const handleDeleteSale = async (saleId, receiptNumber) => {
  if (!isAdmin) {
    toast.error('Only admins can delete sales');
    return;
  }
  
  if (!confirm(`Are you sure you want to delete sale #${receiptNumber}? This action cannot be undone.`)) {
    return;
  }
  
  try {
    await api.delete(`/sales/${saleId}`);
    toast.success('Sale deleted successfully');
    fetchData(); // Refresh the sales list
    fetchSummary(); // Refresh summary totals
  } catch (error) {
    console.error('Delete error:', error);
    toast.error(error.response?.data?.error || 'Failed to delete sale');
  }
};

const fetchSummary = async () => {
  try {
    const params = new URLSearchParams();
    
    if (debouncedSearch) {
      params.append('search', debouncedSearch);
    }
    
    // ✅ Add date filters to summary too
    if (startDate) {
      params.append('startDate', new Date(startDate).toISOString());
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      params.append('endDate', endOfDay.toISOString());
    }
    
    // let locationToFilter = filterLocation;
    // if (!isAdmin && userLocationId) {
    //   locationToFilter = userLocationId;
    // }
    let locationToFilter = filterLocation;
    if (user?.role !== 'ADMIN' && user?.locationId) {
      locationToFilter = user.locationId;
    }
    
    if (locationToFilter) {
      params.append('locationId', locationToFilter);
    }

    const summaryRes = await api.get(`/sales/summary?${params.toString()}`);
    
    setSummary({
      totalRevenue: summaryRes.data.totalRevenue || 0,
      totalTransactions: summaryRes.data.totalTransactions || 0,
      averageSale: summaryRes.data.averageSale || 0
    });
    
  } catch (error) {
    console.error('Failed to load summary:', error);
  }
};

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
      saleDate: new Date(sale.createdAt).toISOString().slice(0, 16),
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

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...editForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    newItems[index].subtotal = newItems[index].quantity * newItems[index].unitPrice;
    const newTotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    setEditForm(prev => ({
      ...prev,
      items: newItems,
      totalAmount: newTotal
    }));
  };

  const handleUpdateSale = async (e) => {
    if (user?.role !== 'ADMIN') {
      toast.error('Unauthorized: Only admins can update sales');
      return;
    }
    e.preventDefault();
    
    try {
      await api.put(`/sales/${editingSale.id}`, {
        ...editForm,
        items: editForm.items.map(({ id, ...item }) => item)
      });
      
      toast.success('Sale updated successfully');
      setIsEditModalOpen(false);
      setEditingSale(null);
      fetchData();
      fetchSummary();
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.error || 'Failed to update sale');
    }
  };

  const formatCurrency = (amount) => {
    return `KES ${parseFloat(amount).toLocaleString()}`;
  };

const handleClearFilters = () => {
  setSearchQuery('');
  setDebouncedSearch('');
  setFilterLocation('');
  setStartDate('');  // ✅ Reset date filters
  setEndDate('');
  setPage(1);
};

  // Helper function to render items with tooltip
  const renderItems = (items) => {
    if (!items || items.length === 0) return '-';
    
    if (items.length === 1) {
      return (
        <div className="text-sm">
          <span className="font-medium">{items[0].productVariant.product.name}</span>
          <span className="text-gray-500 ml-1">(x{items[0].quantity})</span>
        </div>
      );
    }
    
    // For multiple items, show first item + count with tooltip
    return (
      <div className="relative group">
        <div className="text-sm cursor-help">
          <span className="font-medium">{items[0].productVariant.product.name}</span>
          <span className="text-gray-500 ml-1">(x{items[0].quantity})</span>
          <span className="text-xs text-gray-400 ml-1">+{items.length - 1} more</span>
        </div>
        <div className="absolute left-0 top-full mt-1 z-10 hidden group-hover:block bg-gray-800 text-white text-xs rounded-lg p-2 min-w-[200px] shadow-lg">
          {items.map((item, idx) => (
            <div key={idx} className="py-1 border-b border-gray-600 last:border-0">
              <span className="font-medium">{item.productVariant.product.name}</span>
              <span className="ml-2">x{item.quantity}</span>
              <span className="ml-2 text-gray-300">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading && sales.length === 0) return <div className="p-6">Loading sales history...</div>;

  return (
    <Sidebar>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Sales History</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card bg-green-50 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.totalRevenue)}</p>
            {(debouncedSearch || filterLocation) && (
              <p className="text-xs text-gray-500 mt-1">Filtered results</p>
            )}
          </div>
          <div className="card bg-blue-50 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total Transactions</p>
            <p className="text-2xl font-bold text-blue-700">{summary.totalTransactions}</p>
            {(debouncedSearch || filterLocation) && (
              <p className="text-xs text-gray-500 mt-1">Filtered results</p>
            )}
          </div>
          <div className="card bg-purple-50 border-l-4 border-purple-500">
            <p className="text-sm text-gray-600">Average Sale</p>
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(summary.averageSale)}</p>
            {(debouncedSearch || filterLocation) && (
              <p className="text-xs text-gray-500 mt-1">Filtered results</p>
            )}
          </div>
        </div>

        {/* Filters */}
{/* Filters */}
<div className="card mb-6">
  <div className="flex flex-wrap gap-4 items-end">
    {/* Search */}
    <div className="flex-1 min-w-[200px]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
<input
  type="text"
  placeholder="Search by Receipt #, Customer, or Product..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="input-field pl-10 w-full"
/>
      </div>
    </div>
    
    {/* Location Filter */}
    {isAdmin && (
      <div className="w-full md:w-48">
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="input-field w-full"
        >
          <option value="">All Locations</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>
    )}
    
    {/* Date Filters */}
    <div className="flex flex-wrap gap-2">
      <input
        type="date"
        value={startDate}
        onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
        className="input-field w-36"
        max={endDate || undefined}
        title="Start date"
      />
      <span className="self-center text-gray-400">→</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
        className="input-field w-36"
        min={startDate || undefined}
        title="End date"
      />
    </div>
    
    {/* Quick presets */}
    <div className="flex gap-1">
      <button onClick={() => {
        const today = new Date().toISOString().slice(0, 10);
        setStartDate(today); setEndDate(today); setPage(1);
      }} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">
        Today
      </button>
      <button onClick={() => {
        const end = new Date();
        const start = new Date(); start.setDate(start.getDate() - 7);
        setStartDate(start.toISOString().slice(0, 10));
        setEndDate(end.toISOString().slice(0, 10)); setPage(1);
      }} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">
        7D
      </button>
      <button onClick={() => {
        const end = new Date();
        const start = new Date(); start.setMonth(start.getMonth() - 1);
        setStartDate(start.toISOString().slice(0, 10));
        setEndDate(end.toISOString().slice(0, 10)); setPage(1);
      }} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">
        30D
      </button>
    </div>
    
    {/* Clear button */}
    {(searchQuery || filterLocation || startDate || endDate) && (
      <button
        onClick={handleClearFilters}
        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200"
      >
        Clear All
      </button>
    )}
  </div>
  
  {/* Active filter badges */}
  {(searchQuery || filterLocation || startDate || endDate) && (
    <div className="mt-3 flex flex-wrap gap-2">
      {searchQuery && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
          Search: {searchQuery}
          <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-blue-600">×</button>
        </span>
      )}
      {filterLocation && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          Location: {locations.find(l => l.id === filterLocation)?.name}
          <button onClick={() => setFilterLocation('')} className="ml-1 hover:text-green-600">×</button>
        </span>
      )}
      {(startDate || endDate) && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
          {startDate ? new Date(startDate).toLocaleDateString() : 'Start'} → {endDate ? new Date(endDate).toLocaleDateString() : 'End'}
          <button onClick={() => { setStartDate(''); setEndDate(''); }} className="ml-1 hover:text-indigo-600">×</button>
        </span>
      )}
    </div>
  )}
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Items Sold</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Buy Cost</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total</th>
                {user?.role === 'ADMIN' && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    No sales found matching your filters.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm text-gray-800">{sale.receiptNumber}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(sale.createdAt).toLocaleString('en-KE', {
                        timeZone: 'Africa/Nairobi',
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })} <br/>
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
                    <td className="px-4 py-3">
                      {renderItems(sale.items)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatCurrency(
                        sale.items.reduce((sum, item) => 
                          sum + (item.productVariant.product.buyPrice * item.quantity), 0)
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-800">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      {user?.role === 'ADMIN' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(sale)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit Sale"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteSale(sale.id, sale.receiptNumber)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete Sale"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {meta && meta.total > 0 && (
            <div className="flex justify-between items-center mt-4">
              <button
                disabled={page === 1}
                onClick={() => setPage(prev => prev - 1)}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {meta.page} of {meta.lastPage} ({meta.total} total sales)
              </span>
              <button
                disabled={page === meta.lastPage}
                onClick={() => setPage(prev => prev + 1)}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Edit Sale Modal - Keep existing */}
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
                  <option value="card">Card</option>
                  <option value="credit">Credit</option>
                  <option value="Paybill dtb">Paybill DTB</option>
                  <option value="Paybill coop">Paybill COOP</option>
                  <option value="Paybill kcb">Paybill KCB</option>
                  <option value="Paybill absa">Paybill ABSA</option>
                  <option value="Buy Goods Till">Buy Goods Till</option>
                  <option value="mpesa">MPESA (Personal Number)</option>
                  <option value="loop paybill">Loop Paybill</option>
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