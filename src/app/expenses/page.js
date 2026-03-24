'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userLocationId, setUserLocationId] = useState(null);
  const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [limit] = useState(10);
const [totalExpenses, setTotalExpenses] = useState(0);
  
  // Helper function to get local date string in YYYY-MM-DD format
  const getLocalDateString = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
  fetchData();
}, [page]);
  
  const [formData, setFormData] = useState({
    locationId: '',
    category: 'MISCELLANEOUS',
    amount: '',
    description: '',
    date: getLocalDateString(new Date())
  });

  const categories = [
    { value: 'RENT_UTILITIES', label: 'Rent & Utilities' },
    { value: 'SALARIES', label: 'Staff Salaries' },
    { value: 'STOCK_PURCHASE', label: 'Stock Purchases' },
    { value: 'MISCELLANEOUS', label: 'Miscellaneous' }
  ];

  useEffect(() => {
    if (user) {
      setIsAdmin(user.role === 'ADMIN');
      setUserLocationId(user.locationId);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterExpensesByLocation();
  }, [expenses, userLocationId, isAdmin]);

  const filterExpensesByLocation = () => {
    if (!expenses) return;

    if (isAdmin) {
      setFilteredExpenses(expenses);
      return;
    }

    if (userLocationId) {
      setFilteredExpenses(expenses.filter(expense => expense.locationId === userLocationId));
    } else {
      setFilteredExpenses([]);
    }
  };

const fetchData = async () => {
  try {
    const [expensesRes, locationsRes] = await Promise.all([
      api.get(`/expenses?page=${page}&limit=${limit}`),
      api.get('/locations')
    ]);

    setExpenses(expensesRes.data.data); // array for table
    setTotalPages(expensesRes.data.pagination.totalPages);
    setTotalExpenses(expensesRes.data.totalAmount || 0); // total sum across all pages

    setLocations(locationsRes.data);

    if (locationsRes.data.length > 0) {
      if (!isAdmin && userLocationId) {
        setFormData(prev => ({ ...prev, locationId: userLocationId }));
      } else {
        setFormData(prev => ({ ...prev, locationId: locationsRes.data[0].id }));
      }
    }
  } catch (error) {
    toast.error('Failed to load expenses');
  } finally {
    setLoading(false);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Send the date as is (YYYY-MM-DD format)
      await api.post('/expenses', formData);
      toast.success('Expense added successfully');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add expense');
    }
  };

  const handleEdit = (expense) => {
    if (!isAdmin) {
      toast.error('Only admins can edit expenses');
      return;
    }
    setEditingExpense(expense);
    setFormData({
      locationId: expense.locationId,
      category: expense.category,
      amount: expense.amount,
      description: expense.description || '',
      date: getLocalDateString(new Date(expense.date))
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only admins can update expenses');
      return;
    }
    
    try {
      await api.put(`/expenses/${editingExpense.id}`, formData);
      toast.success('Expense updated successfully');
      setShowEditModal(false);
      setEditingExpense(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update expense');
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      toast.error('Only admins can delete expenses');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const resetForm = () => {
    setFormData({
      locationId: !isAdmin && userLocationId ? userLocationId : (locations[0]?.id || ''),
      category: 'MISCELLANEOUS',
      amount: '',
      description: '',
      date: getLocalDateString(new Date())
    });
  };

  const getCategoryLabel = (value) => {
    return categories.find(c => c.value === value)?.label || value;
  };

  const formatCurrency = (amount) => {
    return `KES ${parseFloat(amount).toLocaleString()}`;
  };

  // Format date for display (handle UTC dates properly)
  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    // Add timezone offset to display correctly
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() + userTimezoneOffset);
    return localDate.toLocaleDateString();
  };

  if (loading) return <div className="p-6">Loading expenses...</div>;

  // const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Expenses</h1>
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Expense
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card bg-red-50 border-l-4 border-red-500">
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-700">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="card bg-blue-50 border-l-4 border-blue-500">
              <p className="text-sm text-gray-600">Entries Count</p>
              <p className="text-2xl font-bold text-blue-700">{filteredExpenses.length}</p>
            </div>
            
            {/* Show location filter info for non-admins */}
            {!isAdmin && userLocationId && (
              <div className="card bg-gray-50 border-l-4 border-gray-500">
                <p className="text-sm text-gray-600">Showing Expenses For</p>
                <p className="text-lg font-semibold text-gray-700">
                  {locations.find(l => l.id === userLocationId)?.name || 'My Location'}
                </p>
              </div>
            )}
            
            {/* Show admin indicator */}
            {isAdmin && (
              <div className="card bg-purple-50 border-l-4 border-purple-500">
                <p className="text-sm text-gray-600">View Mode</p>
                <p className="text-lg font-semibold text-purple-700">All Locations (Admin)</p>
              </div>
            )}
          </div>

          {/* Expenses Table */}
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Location</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      {!isAdmin && userLocationId 
                        ? 'No expenses recorded for your location yet.'
                        : 'No expenses recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                          {getCategoryLabel(expense.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{expense.location.name}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                        {expense.description || '-'}
                      </td>
                      <td className="px-4 py-3 font-medium text-red-600">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleEdit(expense)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(expense.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="flex justify-between items-center mt-4">
  <button
    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
    disabled={page === 1}
    className="btn-secondary"
  >
    Previous
  </button>

  <span className="text-sm text-gray-600">
    Page {page} of {totalPages}
  </span>

  <button
    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
    disabled={page === totalPages}
    className="btn-secondary"
  >
    Next
  </button>
</div>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Add Expense</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <select
                  required
                  value={formData.locationId}
                  onChange={(e) => setFormData({...formData, locationId: e.target.value})}
                  className="input-field"
                  disabled={!isAdmin}
                >
                  <option value="">Select Location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                {!isAdmin && (
                  <p className="text-xs text-gray-500 mt-1">
                    Expenses are automatically assigned to your branch
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="input-field"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="input-field"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="input-field"
                  placeholder="Optional details..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Save Expense</button>
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

      {/* Edit Expense Modal */}
      {showEditModal && editingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Edit Expense</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingExpense(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <select
                  required
                  value={formData.locationId}
                  onChange={(e) => setFormData({...formData, locationId: e.target.value})}
                  className="input-field"
                >
                  <option value="">Select Location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="input-field"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="input-field"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="input-field"
                  placeholder="Optional details..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Update Expense</button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingExpense(null);
                    resetForm();
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Sidebar>
  );
}