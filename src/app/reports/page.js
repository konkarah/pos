'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, Calendar } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sales');
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (locations.length > 0) {
      fetchReport();
    }
  }, [activeTab, period, selectedLocation]);

  const fetchLocations = async () => {
    try {
      const res = await api.get('/locations');
      setLocations(res.data);
    } catch (error) {
      console.error('Failed to load locations');
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setReportData(null); // Clear previous data to avoid flickering old data
    try {
      let endpoint = '';
      if (activeTab === 'sales') endpoint = '/reports/sales';
      else if (activeTab === 'expenses') endpoint = '/reports/expenses';
      else if (activeTab === 'profit') endpoint = '/reports/profit';

      const params = { period, locationId: selectedLocation || undefined };
      const res = await api.get(endpoint, { params });
      setReportData(res.data);
    } catch (error) {
      toast.error('Failed to load report data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'KES 0.00';
    return `KES ${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPeriodLabel = () => {
    const labels = {
      daily: 'Today',
      monthly: 'This Month',
      quarterly: 'This Quarter',
      'semi-annually': 'Last 6 Months',
      yearly: 'This Year'
    };
    return labels[period] || 'Custom';
  };

  return (
    <Sidebar>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
          <button className="btn-secondary flex items-center gap-2" onClick={() => toast.success('Export feature coming soon!')}>
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>

        {/* Controls */}
        <div className="card mb-6 space-y-4">
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
            <button
              onClick={() => setActiveTab('profit')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'profit' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Profit & Loss
            </button>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="input-field w-48"
              >
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi-annually">Semi-Annually</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="input-field w-48"
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>

            <span className="ml-auto text-sm text-gray-500">
              Showing data for: <strong>{getPeriodLabel()}</strong>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            Generating report...
          </div>
        ) : !reportData ? (
          <div className="text-center py-12 text-gray-500">No data available for this period.</div>
        ) : (
          <div className="space-y-6">
            
            {/* Summary Cards based on Tab */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeTab === 'sales' && reportData.summary && (
                <>
                  <div className="card bg-blue-50 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(reportData.summary.totalRevenue)}</p>
                  </div>
                  <div className="card bg-green-50 border-l-4 border-green-500">
                    <p className="text-sm text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold text-green-700">{reportData.summary.totalTransactions}</p>
                  </div>
                  <div className="card bg-purple-50 border-l-4 border-purple-500">
                    <p className="text-sm text-gray-600">Items Sold</p>
                    <p className="text-2xl font-bold text-purple-700">{reportData.summary.totalItems}</p>
                  </div>
                  <div className="card bg-indigo-50 border-l-4 border-indigo-500">
                    <p className="text-sm text-gray-600">Avg. Transaction</p>
                    <p className="text-2xl font-bold text-indigo-700">{formatCurrency(reportData.summary.averageTransactionValue)}</p>
                  </div>
                </>
              )}

              {activeTab === 'expenses' && reportData.summary && (
                <>
                  <div className="card bg-red-50 border-l-4 border-red-500">
                    <p className="text-sm text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(reportData.summary.totalExpenses)}</p>
                  </div>
                  <div className="card bg-orange-50 border-l-4 border-orange-500">
                    <p className="text-sm text-gray-600">Entries</p>
                    <p className="text-2xl font-bold text-orange-700">{reportData.summary.totalExpenseEntries}</p>
                  </div>
                  <div className="card bg-gray-50 border-l-4 border-gray-500 col-span-2">
                    <p className="text-sm text-gray-600">Note</p>
                    <p className="text-lg font-medium text-gray-700 mt-1">Detailed breakdown below</p>
                  </div>
                </>
              )}

              {activeTab === 'profit' && (
                <>
                  <div className="card bg-blue-50 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(reportData.revenue)}</p>
                  </div>
                  <div className="card bg-orange-50 border-l-4 border-orange-500">
                    <p className="text-sm text-gray-600">COGS</p>
                    <p className="text-2xl font-bold text-orange-700">{formatCurrency(reportData.cogs)}</p>
                  </div>
                  <div className="card bg-red-50 border-l-4 border-red-500">
                    <p className="text-sm text-gray-600">Operating Expenses</p>
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(reportData.operatingExpenses)}</p>
                  </div>
                  <div className={`card border-l-4 ${reportData.netProfit >= 0 ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
                    <p className="text-sm text-gray-600">Net Profit</p>
                    <p className={`text-2xl font-bold ${reportData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatCurrency(reportData.netProfit)}
                    </p>
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
                    {activeTab === 'sales' && reportData.salesByLocation ? (
                      <BarChart data={reportData.salesByLocation}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="locationId" tickFormatter={(id) => id.substring(0, 8)} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="totalRevenue" fill="#0ea5e9" name="Revenue" />
                      </BarChart>
                    ) : activeTab === 'expenses' && reportData.expensesByCategory ? (
                      <BarChart data={reportData.expensesByCategory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" tickFormatter={(cat) => cat.replace('_', ' ')} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="totalAmount" fill="#ef4444" name="Amount" />
                      </BarChart>
                    ) : activeTab === 'profit' ? (
                      <LineChart data={[{ name: 'Period', revenue: reportData.revenue, profit: reportData.netProfit, expense: reportData.operatingExpenses }]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue" />
                        <Line type="monotone" dataKey="expense" stroke="#ef4444" name="Expenses" />
                        <Line type="monotone" dataKey="profit" stroke="#3b82f6" name="Net Profit" />
                      </LineChart>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">No chart data available</div>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* List Section (Fixed to prevent crashes) */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">
                  {activeTab === 'sales' && 'Top Selling Products'}
                  {activeTab === 'expenses' && 'Recent Expense Entries'}
                  {activeTab === 'profit' && 'Summary Breakdown'}
                </h3>
                
                {/* SALES TAB: Top Products */}
                {activeTab === 'sales' && (
                  <div className="overflow-y-auto max-h-64">
                    {reportData.topProducts && reportData.topProducts.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="pb-2">Product</th>
                            <th className="pb-2 text-right">Qty</th>
                            <th className="pb-2 text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.topProducts.map((item, idx) => (
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
                    {reportData.expenses && reportData.expenses.length > 0 ? (
                      reportData.expenses.slice(0, 10).map((exp) => (
                        <div key={exp.id} className="flex justify-between items-center text-sm border-b pb-2">
                          <div>
                            <p className="font-medium">{exp.category?.replace('_', ' ') || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(exp.date).toLocaleDateString()} • {exp.location?.name || 'Unknown'}
                            </p>
                          </div>
                          <span className="font-bold text-red-600">{formatCurrency(exp.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">No expense entries found.</div>
                    )}
                  </div>
                )}

                {/* PROFIT TAB: Breakdown */}
                {activeTab === 'profit' && (
                  <div className="space-y-4">
                    <div className="flex justify-between py-2 border-b">
                      <span>Total Revenue</span>
                      <span className="font-medium text-green-600">{formatCurrency(reportData.revenue)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span>Cost of Goods Sold (COGS)</span>
                      <span className="font-medium text-orange-600">-{formatCurrency(reportData.cogs)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b bg-green-50 px-2">
                      <span className="font-bold">Gross Profit</span>
                      <span className="font-bold text-green-700">{formatCurrency(reportData.grossProfit)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span>Operating Expenses</span>
                      <span className="font-medium text-red-600">-{formatCurrency(reportData.operatingExpenses)}</span>
                    </div>
                    <div className="flex justify-between py-3 bg-blue-50 px-2 rounded">
                      <span className="font-bold text-lg">Net Profit</span>
                      <span className={`font-bold text-lg ${reportData.netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        {formatCurrency(reportData.netProfit)}
                      </span>
                    </div>
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