'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis,Cell, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { Download, Calendar, TrendingUp, TrendingDown, Package } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('sales');
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [filteredReportData, setFilteredReportData] = useState(null);
  const [stockMovementData, setStockMovementData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userLocationId, setUserLocationId] = useState(null);

  useEffect(() => {
    if (user) {
      setIsAdmin(user.role === 'ADMIN');
      setUserLocationId(user.locationId);
      if (user.locationId && user.role !== 'ADMIN') {
        setSelectedLocation(user.locationId);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (initialized) {
      fetchReport();
    }
  }, [activeTab, period, initialized]);

  useEffect(() => {
    if (reportData) {
      filterReportDataByLocation();
    }
  }, [selectedLocation, reportData]);

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'KES 0.00';
    const num = parseFloat(amount);
    const formatted = Math.abs(num).toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    return num < 0 ? `- KES ${formatted}` : `KES ${formatted}`;
  };

  useEffect(() => {
    if (!useCustomRange) {
      setCustomStartDate('');
      setCustomEndDate('');
      if (initialized) {
        fetchReport();
      }
    }
  }, [useCustomRange, initialized]);

  const fetchLocations = async () => {
    try {
      const res = await api.get('/locations');
      setLocations(res.data);
      setInitialized(true);
    } catch (error) {
      console.error('Failed to load locations');
    }
  };

  const getPeriodLabel = () => {
    if (useCustomRange && customStartDate && customEndDate) {
      const start = new Date(customStartDate).toLocaleDateString('en-KE', { 
        day: 'numeric', month: 'short' 
      });
      const end = new Date(customEndDate).toLocaleDateString('en-KE', { 
        day: 'numeric', month: 'short', year: 'numeric' 
      });
      return `${start} - ${end}`;
    }
    
    const labels = {
      daily: 'Today',
      monthly: 'This Month',
      quarterly: 'This Quarter',
      'semi-annually': 'Last 6 Months',
      yearly: 'This Year'
    };
    return labels[period] || 'Custom';
  };

  const filterReportDataByLocation = () => {
    if (!reportData) return;

    if (!selectedLocation) {
      setFilteredReportData(reportData);
      return;
    }

    const filtered = { ...reportData };

    if (activeTab === 'sales' && filtered.salesByLocation) {
      filtered.salesByLocation = filtered.salesByLocation.filter(
        item => item.locationId === selectedLocation
      );
      
      const filteredSales = filtered.salesByLocation;
filtered.summary = {
  ...(filtered.summary || {}),
        totalRevenue: filteredSales.reduce((sum, item) => sum + item.totalRevenue, 0),
        totalTransactions: filteredSales.reduce((sum, item) => sum + item.transactionCount, 0),
        averageTransactionValue: filteredSales.reduce((sum, item) => sum + item.totalRevenue, 0) / 
                                 filteredSales.reduce((sum, item) => sum + item.transactionCount, 0) || 0
      };
    }

    if (activeTab === 'expenses' && filtered.expenses) {
      filtered.expenses = filtered.expenses.filter(
        expense => expense.locationId === selectedLocation
      );
      
      filtered.summary = {
        ...filtered.summary,
        totalExpenses: filtered.expenses.reduce((sum, exp) => sum + exp.amount, 0),
        totalExpenseEntries: filtered.expenses.length
      };
      
      const categoryMap = new Map();
      filtered.expenses.forEach(exp => {
        if (categoryMap.has(exp.category)) {
          categoryMap.set(exp.category, {
            category: exp.category,
            totalAmount: categoryMap.get(exp.category).totalAmount + exp.amount,
            count: categoryMap.get(exp.category).count + 1
          });
        } else {
          categoryMap.set(exp.category, {
            category: exp.category,
            totalAmount: exp.amount,
            count: 1
          });
        }
      });
      filtered.expensesByCategory = Array.from(categoryMap.values());
    }

    setFilteredReportData(filtered);
  };

const fetchReport = async () => {
  setLoading(true);
  setReportData(null);
  setFilteredReportData(null);

  try {
    const params = {};

    if (useCustomRange && customStartDate && customEndDate) {
      params.startDate = customStartDate;
      params.endDate = customEndDate;
    } else {
      params.period = period;
    }

    if (selectedLocation && isAdmin) {
      params.locationId = selectedLocation;
    }

    // -----------------------------
    // PROFIT TAB → CALL MULTIPLE APIs
    // -----------------------------
    if (activeTab === 'profit') {
      const [stockRes, profitRes] = await Promise.all([
        api.get('/reports/stock-movement', { params }),
        api.get('/reports/profit', { params })
      ]);

      // keep existing behavior
      setStockMovementData(stockRes.data);

      // 👇 merge both responses into ONE object
      setReportData({
        ...stockRes.data,
        ...profitRes.data,
        // optional: keep them grouped too
        stockMovement: stockRes.data,
        profit: profitRes.data
      });

      return;
    }

    // -----------------------------
    // OTHER TABS (unchanged)
    // -----------------------------
    let endpoint = '';
    if (activeTab === 'sales') endpoint = '/reports/sales';
    else if (activeTab === 'expenses') endpoint = '/reports/expenses';

    const res = await api.get(endpoint, { params });
    setReportData(res.data);

  } catch (error) {
    toast.error('Failed to load report data');
    console.error(error);
  } finally {
    setLoading(false);
  }
};

const exportReportExcel = async () => {
  try {
    toast.loading('Generating Excel file...', { id: 'export' });
    
    const params = {};
    if (useCustomRange && customStartDate && customEndDate) {
      params.startDate = customStartDate;
      params.endDate = customEndDate;
    } else {
      params.period = period;
    }
    if (selectedLocation && isAdmin) {
      params.locationId = selectedLocation;
    }

    const response = await api.get(`/reports/export/${activeTab}`, { 
      params,
      responseType: 'blob'
    });

    // Check if response has valid data
    if (!response.data || response.data.size === 0) {
      throw new Error('Empty response from server');
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    const dateStr = new Date().toISOString().split('T')[0];
    const locationSuffix = selectedLocation ? `-${selectedLocation}` : '';
    link.setAttribute('download', `${activeTab}-report${locationSuffix}-${dateStr}.xlsx`);
    
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    toast.success('Excel file downloaded!', { id: 'export' });
  } catch (error) {
    console.error('Export error:', error);
    toast.error('Failed to export: ' + (error.message || 'Check filters and try again'), { 
      id: 'export',
      duration: 5000 
    });
  }
};

  const getCurrentDisplayData = () => {
    return filteredReportData || reportData;
  };

  const currentData = getCurrentDisplayData();

  return (
    <Sidebar>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
          {isAdmin && (
  <button 
    className="btn-secondary flex items-center gap-2" 
    onClick={exportReportExcel}
    disabled={loading || !reportData}
  >
    <Download className="w-4 h-4" /> 
    {loading ? 'Generating...' : 'Export Excel'}
  </button>
)}
        </div>

        {/* Controls */}
        <div className="card mb-6 space-y-4">
          {/* Report Tabs */}
          <div className="flex flex-wrap gap-4 border-b pb-4">
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'sales' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Sales Report
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'expenses' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Expenses Report
            </button>
            {isAdmin && (
  <button
    onClick={() => setActiveTab('profit')}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      activeTab === 'profit' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    Profit & Loss
  </button>
)}
          </div>

          {/* Date Range & Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            
            {/* Period Toggle */}
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setUseCustomRange(false)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    !useCustomRange ? 'bg-white shadow text-primary-600 font-medium' : 'text-gray-600'
                  }`}
                >
                  Preset
                </button>
                <button
                  onClick={() => setUseCustomRange(true)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    useCustomRange ? 'bg-white shadow text-primary-600 font-medium' : 'text-gray-600'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Preset Period Select */}
            {!useCustomRange && (
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="input-field w-40"
              >
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi-annually">Semi-Annually</option>
                <option value="yearly">Yearly</option>
              </select>
            )}

            {/* Custom Date Inputs */}
            {useCustomRange && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="input-field w-36 text-sm"
                  max={customEndDate || undefined}
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="input-field w-36 text-sm"
                  min={customStartDate || undefined}
                />
              </div>
            )}

            {/* Quick Range Buttons */}
            {useCustomRange && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - 7);
                    setCustomStartDate(start.toISOString().split('T')[0]);
                    setCustomEndDate(end.toISOString().split('T')[0]);
                  }}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setMonth(start.getMonth() - 1);
                    setCustomStartDate(start.toISOString().split('T')[0]);
                    setCustomEndDate(end.toISOString().split('T')[0]);
                  }}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date(end.getFullYear(), 0, 1);
                    setCustomStartDate(start.toISOString().split('T')[0]);
                    setCustomEndDate(end.toISOString().split('T')[0]);
                  }}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Year to Date
                </button>
              </div>
            )}

            {/* Location Filter - Always show, but restrict based on user role */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="input-field w-48"
              disabled={!isAdmin && userLocationId} // Disable for non-admin users with assigned location
            >
              {/* For non-admin users, only show their location */}
              {!isAdmin && userLocationId ? (
                <>
                  <option value={userLocationId}>
                    {locations.find(loc => loc.id === userLocationId)?.name || 'My Location'}
                  </option>
                </>
              ) : (
                <>
                  <option value="">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </>
              )}
            </select>

            {/* Show info text for non-admin users */}
            {!isAdmin && userLocationId && (
              <div className="text-xs text-gray-500">
                You can only view data for your assigned location
              </div>
            )}

            {/* Apply Button (for custom range) */}
            {useCustomRange && (
              <button
                onClick={fetchReport}
                disabled={!customStartDate || !customEndDate || loading}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Apply Range'}
              </button>
            )}

            {/* Period Label */}
            <span className="ml-auto text-sm text-gray-500">
              Showing: <strong>{useCustomRange && customStartDate && customEndDate 
                ? `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`
                : getPeriodLabel()
              }</strong>
              {selectedLocation && locations.find(l => l.id === selectedLocation) && (
                <span className="ml-2"> • Location: <strong>{locations.find(l => l.id === selectedLocation)?.name}</strong></span>
              )}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            Generating report...
          </div>
        ) : !currentData ? (
          <div className="text-center py-12 text-gray-500">No data available for this period.</div>
        ) : (
          <div className="space-y-6">
            
            {/* Summary Cards based on Tab */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeTab === 'sales' && currentData.summary && (
                <>
                  <div className="card bg-blue-50 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(currentData.summary.totalRevenue)}</p>
                  </div>
                  <div className="card bg-green-50 border-l-4 border-green-500">
                    <p className="text-sm text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold text-green-700">{currentData.summary.totalTransactions}</p>
                  </div>
                  <div className="card bg-purple-50 border-l-4 border-purple-500">
                    <p className="text-sm text-gray-600">Items Sold</p>
                    <p className="text-2xl font-bold text-purple-700">{currentData.summary.totalItems}</p>
                  </div>
                  <div className="card bg-indigo-50 border-l-4 border-indigo-500">
                    <p className="text-sm text-gray-600">Avg. Transaction</p>
                    <p className="text-2xl font-bold text-indigo-700">{formatCurrency(currentData.summary.averageTransactionValue)}</p>
                  </div>
                </>
              )}

              {activeTab === 'expenses' && currentData.summary && (
                <>
                  <div className="card bg-red-50 border-l-4 border-red-500">
                    <p className="text-sm text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(currentData.summary.totalExpenses)}</p>
                  </div>
                  <div className="card bg-orange-50 border-l-4 border-orange-500">
                    <p className="text-sm text-gray-600">Entries</p>
                    <p className="text-2xl font-bold text-orange-700">{currentData.summary.totalExpenseEntries}</p>
                  </div>
                  <div className="card bg-gray-50 border-l-4 border-gray-500 col-span-2">
                    <p className="text-sm text-gray-600">Note</p>
                    <p className="text-lg font-medium text-gray-700 mt-1">Detailed breakdown below</p>
                  </div>
                </>
              )}

              {activeTab === 'profit' && currentData && (
  <>
    <div className="card bg-blue-50 border-l-4 border-blue-500">
      <p className="text-sm text-gray-600">Total Revenue</p>
      <p className="text-2xl font-bold text-blue-700">{formatCurrency(currentData.summary?.totalRevenue ?? currentData.revenue)}</p>
    </div>
    <div className="card bg-orange-50 border-l-4 border-orange-500">
      <p className="text-sm text-gray-600">COGS</p>
      <p className="text-2xl font-bold text-orange-700">{formatCurrency(currentData.summary?.cogs ?? currentData.cogs)}</p>
    </div>
    <div className="card bg-red-50 border-l-4 border-red-500">
      <p className="text-sm text-gray-600">Operating Expenses</p>
      <p className="text-2xl font-bold text-red-700">{formatCurrency(currentData.summary?.operatingExpenses ?? currentData.operatingExpenses)}</p>
    </div>
    <div className={`card border-l-4 ${(currentData.summary?.netProfit ?? currentData.netProfit) >= 0 ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
      <p className="text-sm text-gray-600">Net Profit</p>
      <p className={`text-2xl font-bold ${(currentData.summary?.netProfit ?? currentData.netProfit) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
        {formatCurrency(currentData.summary?.netProfit ?? currentData.netProfit)}
      </p>
    </div>
                  <div className="card bg-red-50 border-l-4 border-red-500">
                    <p className="text-sm text-gray-600">Total Stock Out</p>
                    <p className="text-2xl font-bold text-red-700">{stockMovementData?.summary?.totalStockOut || 0}</p>
                  </div>
                  <div className="card bg-green-50 border-l-4 border-green-500">
                    <p className="text-sm text-gray-600">Total Stock In</p>
                    <p className="text-2xl font-bold text-green-700">{stockMovementData?.summary?.totalStockIn || 0}</p>
                  </div>
                  <div className="card bg-blue-50 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600">Net Stock Change</p>
                    <p className={`text-2xl font-bold ${(stockMovementData?.summary?.netChange || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {(stockMovementData?.summary?.netChange || 0) >= 0 ? '+' : ''}{stockMovementData?.summary?.netChange || 0}
                    </p>
                  </div>
                  <div className="card bg-purple-50 border-l-4 border-purple-500">
                    <p className="text-sm text-gray-600">Days Tracked</p>
                    <p className="text-2xl font-bold text-purple-700">{stockMovementData?.data?.length || 0}</p>
                  </div>
                </>
)}
            </div>

            {/* Charts & Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart Section */}
<div className="card">
  <h3 className="text-lg font-semibold mb-4">
    {activeTab === 'sales' && 'Sales by Location'}
    {activeTab === 'expenses' && 'Expenses by Category'}
    {activeTab === 'profit' && 'Financial Overview'}
  </h3>
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      {activeTab === 'sales' && currentData.salesByLocation ? (
        <BarChart data={currentData.salesByLocation}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="locationName" />
          <YAxis />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Bar dataKey="totalRevenue" fill="#0ea5e9" name="Revenue" />
        </BarChart>
      ) : activeTab === 'expenses' && currentData.expensesByCategory ? (
        <BarChart data={currentData.expensesByCategory}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" tickFormatter={(cat) => cat.replace(/_/g, ' ')} />
          <YAxis />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Bar dataKey="totalAmount" fill="#ef4444" name="Amount" />
        </BarChart>
      ) : activeTab === 'profit' && stockMovementData?.data ? (
                      <AreaChart data={stockMovementData.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="stockOut" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Stock Out" />
                        <Area type="monotone" dataKey="stockIn" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Stock In" />
                        <Line type="monotone" dataKey="cumulativeStock" stroke="#3b82f6" strokeWidth={2} name="Cumulative Stock" dot={false} />
                      </AreaChart>
                    )  : (
        <div className="flex items-center justify-center h-full text-gray-400">No chart data available</div>
      )}
    </ResponsiveContainer>
  </div>
</div>

              {/* List Section */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">
                  {activeTab === 'sales' && 'Top Selling Products'}
                  {activeTab === 'expenses' && 'Recent Expense Entries'}
                  {activeTab === 'profit' && 'Summary Breakdown'}
                </h3>
                
                {/* SALES TAB: Top Products */}
                {activeTab === 'sales' && (
                  <div className="overflow-y-auto max-h-64">
                    {currentData.topProducts && currentData.topProducts.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="pb-2">Product</th>
                            <th className="pb-2 text-right">Qty</th>
                            <th className="pb-2 text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentData.topProducts.map((item, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="py-2">{item.product?.name || 'Unknown Product'}</td>
                              <td className="py-2 text-right">{item.quantity || 0}</td>
                              <td className="py-2 text-right font-medium">{formatCurrency(item.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">No top products data available for this period.</div>
                    )}
                  </div>
                )}

                {/* EXPENSES TAB: Recent Entries */}
                {activeTab === 'expenses' && (
                  <div className="overflow-y-auto max-h-64 space-y-3">
                    {currentData.expenses && currentData.expenses.length > 0 ? (
                      currentData.expenses.slice(0, 10).map((exp, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm border-b pb-2">
                          <div>
                            <p className="font-medium">
                              {exp.category?.replace('_', ' ') || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(exp.date).toLocaleDateString()} • {exp.location?.name || 'Unknown'}
                            </p>
                            {exp.description && (
                              <p className="text-xs text-gray-400 italic">{exp.description}</p>
                            )}
                          </div>
                          <span className="font-bold text-red-600">
                            {formatCurrency(exp.amount)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No expense entries found.
                      </div>
                    )}
                  </div>
                )}

                {/* PROFIT TAB: Breakdown */}
                {/* {activeTab === 'profit' && !loading && currentData && (
  <div className="grid grid-cols-2 gap-4">
    <div className="bg-blue-50 rounded-lg p-3">
      <p className="text-xs text-gray-500">Profit Margin</p>
<p className="text-lg font-semibold text-blue-700">
  {currentData.summary?.netMargin 
    ? currentData.summary.netMargin 
    : `${parseFloat(currentData.profitMargin ?? 0).toFixed(2)}%`}
</p>
    </div>
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500">Gross Profit</p>
      <p className="text-lg font-semibold text-gray-700">
        {formatCurrency(currentData.summary?.grossProfit ?? currentData.grossProfit)}
      </p>
    </div>
  </div>
)} */}
{/* STOCK MOVEMENT TAB: Daily Data */}
                {activeTab === 'profit' && stockMovementData?.data && (
                  <div className="overflow-y-auto max-h-64">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b bg-gray-50">
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2 text-right">Stock Out</th>
                          <th className="px-3 py-2 text-right">Stock In</th>
                          <th className="px-3 py-2 text-right">Net Change</th>
                          <th className="px-3 py-2 text-right">Cumulative</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockMovementData?.data.slice().reverse().slice(0, 10).map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-xs">{item.date}</td>
                            <td className="px-3 py-2 text-right text-red-600">{item.stockOut}</td>
                            <td className="px-3 py-2 text-right text-green-600">{item.stockIn}</td>
                            <td className={`px-3 py-2 text-right font-medium ${item.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.netChange >= 0 ? '+' : ''}{item.netChange}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-blue-600">{item.cumulativeStock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </Sidebar>
  );
}