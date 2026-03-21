'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, Plus, Edit, Trash2, Eye, X, Check, Filter, UserPlus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function UsersPage() {
  // State
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'EMPLOYEE',
    locationId: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Fetch data
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: searchQuery || undefined,
        role: filterRole !== 'all' ? filterRole : undefined,
        locationId: filterLocation !== 'all' ? filterLocation : undefined
      };

      const [usersRes, locationsRes] = await Promise.all([
        api.get('/users', { params }),
        api.get('/users/locations')
      ]);

      setUsers(usersRes.data.data);
      setMeta(usersRes.data.meta);
      setLocations(locationsRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterRole, filterLocation]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Form handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (formData.username.length < 3) errors.username = 'Minimum 3 characters';
    
    if (modalMode === 'create' && !formData.password) {
      errors.password = 'Password is required';
    }
    if (formData.password && formData.password.length < 6) {
      errors.password = 'Minimum 6 characters';
    }
    
    if (!formData.role) errors.role = 'Role is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (modalMode === 'create') {
        await api.post('/users', formData);
        toast.success('User created successfully');
      } else if (modalMode === 'edit' && selectedUser) {
        await api.put(`/users/${selectedUser.id}`, formData);
        toast.success('User updated successfully');
      }
      setIsModalOpen(false);
      fetchUsers();
      resetForm();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', role: 'EMPLOYEE', locationId: '' });
    setFormErrors({});
    setSelectedUser(null);
    setModalMode('create');
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = async (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      locationId: user.locationId || ''
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openViewModal = async (user) => {
    try {
      const res = await api.get(`/users/${user.id}`);
      setSelectedUser(res.data);
      setModalMode('view');
      setIsModalOpen(true);
    } catch (error) {
      toast.error('Failed to load user details');
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Are you sure you want to ${user._count?.sales > 0 ? 'deactivate' : 'delete'} "${user.username}"?`)) {
      return;
    }

    try {
      await api.delete(`/users/${user.id}`);
      toast.success(`User ${user._count?.sales > 0 ? 'deactivated' : 'deleted'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete user');
    }
  };

  // Helper functions
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadge = (role) => {
    const styles = {
      ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
      EMPLOYEE: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[role] || 'bg-gray-100'}`}>
        {role}
      </span>
    );
  };

  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
              <p className="text-gray-500">Manage system users and permissions</p>
            </div>
            <button
              onClick={openCreateModal}
              className="btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>

          {/* Filters */}
          <div className="card mb-6 p-4 space-y-4">
            <div className="flex flex-wrap gap-4">
              {/* Search */}
              <div className="flex-1 min-w-64 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="input-field pl-10 w-full"
                />
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterRole}
                  onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
                  className="input-field w-32"
                >
                  <option value="all">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
              </div>

              {/* Location Filter */}
              <select
                value={filterLocation}
                onChange={(e) => { setFilterLocation(e.target.value); setPage(1); }}
                className="input-field w-48"
              >
                <option value="all">All Locations</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>

              {/* Reset Filters */}
              {(searchQuery || filterRole !== 'all' || filterLocation !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterRole('all');
                    setFilterLocation('all');
                    setPage(1);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Users Table */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No users found</p>
                <button onClick={openCreateModal} className="mt-3 text-primary-600 hover:underline">
                  Create your first user
                </button>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Activity</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{user.username}</p>
                              <p className="text-xs text-gray-400 font-mono">{user.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {user.location?.name || <span className="text-gray-400 italic">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-500">
                            <p>Sales: <span className="font-medium">{user._count?.sales || 0}</span></p>
                            <p>Expenses: <span className="font-medium">{user._count?.expenses || 0}</span></p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openViewModal(user)}
                              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {meta && meta.lastPage > 1 && (
                  <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50">
                    <p className="text-sm text-gray-600">
                      Showing {(meta.page - 1) * meta.limit + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} users
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={meta.page === 1}
                        className="px-3 py-1.5 text-sm bg-white border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1.5 text-sm text-gray-600">
                        Page {meta.page} of {meta.lastPage}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(meta.lastPage, p + 1))}
                        disabled={meta.page === meta.lastPage}
                        className="px-3 py-1.5 text-sm bg-white border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              
              {/* Modal Header */}
              <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
                <h3 className="text-lg font-semibold text-gray-800">
                  {modalMode === 'create' && 'Create New User'}
                  {modalMode === 'edit' && 'Edit User'}
                  {modalMode === 'view' && 'User Details'}
                </h3>
                <button
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4">
                
                {/* View Mode */}
                {modalMode === 'view' && selectedUser && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
                        {selectedUser.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{selectedUser.username}</p>
                        <p className="text-sm text-gray-500">{getRoleBadge(selectedUser.role)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">User ID</p>
                        <p className="font-mono text-sm">{selectedUser.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Role</p>
                        <p>{selectedUser.role}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Location</p>
                        <p>{selectedUser.location?.name || 'Unassigned'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Created</p>
                        <p>{formatDate(selectedUser.createdAt)}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">Activity Summary</p>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-700">{selectedUser._count?.sales || 0}</p>
                          <p className="text-xs text-gray-500">Sales</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-700">{selectedUser._count?.expenses || 0}</p>
                          <p className="text-xs text-gray-500">Expenses</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-700">{selectedUser._count?.createdProducts || 0}</p>
                          <p className="text-xs text-gray-500">Products</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Create/Edit Mode */}
                {(modalMode === 'create' || modalMode === 'edit') && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        className={`input-field w-full ${formErrors.username ? 'border-red-500' : ''}`}
                        placeholder="johndoe"
                        disabled={modalMode === 'edit'}
                      />
                      {formErrors.username && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.username}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password {modalMode === 'edit' && <span className="text-gray-400">(leave blank to keep current)</span>}
                        {modalMode === 'create' && <span className="text-red-500">*</span>}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          className={`input-field w-full pr-10 ${formErrors.password ? 'border-red-500' : ''}`}
                          placeholder={modalMode === 'edit' ? '••••••••' : 'Enter password'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                      {formErrors.password && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Role <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.role}
                          onChange={(e) => handleInputChange('role', e.target.value)}
                          className={`input-field w-full ${formErrors.role ? 'border-red-500' : ''}`}
                        >
                          <option value="EMPLOYEE">Employee</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        {formErrors.role && (
                          <p className="text-xs text-red-500 mt-1">{formErrors.role}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <select
                          value={formData.locationId}
                          onChange={(e) => handleInputChange('locationId', e.target.value)}
                          className="input-field w-full"
                        >
                          <option value="">Unassigned</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => { setIsModalOpen(false); resetForm(); }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                      >
                        {modalMode === 'create' ? (
                          <>
                            <Check className="w-4 h-4" /> Create User
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" /> Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Sidebar>
  );
}