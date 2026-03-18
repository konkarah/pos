'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Download, Search, Filter } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [locations, setLocations] = useState([]);
  const [page, setPage] = useState(1);
const [limit] = useState(10);
const [meta, setMeta] = useState(null);

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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
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
                      <button
                        onClick={() => downloadReceipt(sale.id, sale.receiptNumber)}
                        className="text-primary-600 hover:text-primary-800 flex items-center gap-1 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Receipt
                      </button>
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
    </Sidebar>
  );
}