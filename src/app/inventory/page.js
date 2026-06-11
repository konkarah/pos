'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, RefreshCw, Download, Filter, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function InventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    buyPrice: '',
    sellPrice: 0,
    categoryId: '',
    variants: [{ locationId: '', stockQuantity: 0 }]
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
  locationId: '',
  stockStatus: 'all',
  includeAllLocations: false,
  includeSearch: true
});
const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userLocationId, setUserLocationId] = useState(null);
  const [nextSKU, setNextSKU] = useState('');
  // In your Dashboard or Inventory component
const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in-stock' | 'out-of-stock'

  useEffect(() => {
    if (user) {
      setIsAdmin(user.role === 'ADMIN');
      setUserLocationId(user.locationId);
    }
  }, [user]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 800);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Reset page when search or location changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedLocation, stockFilter]);

  // Fetch data when dependencies change
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [debouncedSearch, page, selectedLocation, user, stockFilter]);

  // Generate next SKU when opening modal
  useEffect(() => {
    if (showModal && !editingProduct) {
      generateNextSKU();
    }
  }, [showModal, editingProduct]);

  const generateNextSKU = async () => {
    try {
      // Fetch the latest product to get the highest SKU number
      const response = await api.get('/products/latest-sku');
      const latestSKU = response.data.latestSKU;
      
      // Extract number from SKU (assuming SKU format is like "10001")
      let nextNumber = 10000; // Default starting point
      
      if (latestSKU) {
        const skuNumber = parseInt(latestSKU);
        if (!isNaN(skuNumber) && skuNumber >= 10000) {
          nextNumber = skuNumber + 1;
        }
      }
      
      setNextSKU(nextNumber.toString());
      setFormData(prev => ({ ...prev, sku: nextNumber.toString() }));
    } catch (error) {
      console.error('Failed to generate SKU:', error);
      // Fallback to default
      setNextSKU('10000');
      setFormData(prev => ({ ...prev, sku: '10000' }));
    }
  };

  const handleGenerateNewSKU = () => {
    const currentNumber = parseInt(formData.sku);
    if (!isNaN(currentNumber) && currentNumber >= 10000) {
      const newNumber = currentNumber + 1;
      setNextSKU(newNumber.toString());
      setFormData(prev => ({ ...prev, sku: newNumber.toString() }));
    } else {
      generateNextSKU();
    }
  };

  const handleLocationChange = (e) => {
    const value = e.target.value;
    setSelectedLocation(value);
    setPage(1);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: nextSKU || '',
      buyPrice: '',
      sellPrice: 0,
      categoryId: '',
      variants: [{ locationId: isAdmin ? '' : userLocationId, stockQuantity: 0 }]
    });
  };

const fetchData = async () => {
  setLoading(true);
  try {
    const [locationsRes, categoriesRes] = await Promise.all([
      api.get('/locations'),
      api.get('/categories')
    ]);

    // Build query params
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '10'
    });
    
    if (debouncedSearch) {
      params.append('search', debouncedSearch);
    }
    
    // Only filter by location if admin AND a location is selected
    if (isAdmin && selectedLocation) {
      params.append('locationId', selectedLocation);
    }

    // ✅ NEW: Add stock filter parameter
    if (stockFilter !== 'all') {
      params.append('stockStatus', stockFilter);
    }

    const productsRes = await api.get(`/products?${params.toString()}`);
    
    const data = productsRes.data.data;
    
    setProducts(data);
    setTotalPages(productsRes.data.totalPages);
    setLocations(locationsRes.data);
    setCategories(categoriesRes.data);
  } catch (error) {
    console.error('Failed to load data:', error);
    toast.error('Failed to load data');
  } finally {
    setLoading(false);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate SKU
    if (!formData.sku || formData.sku.trim() === '') {
      toast.error('SKU is required');
      return;
    }

    let payload = { ...formData };

    // For employees, force their location when creating products
    if (!isAdmin && userLocationId) {
      payload.variants = payload.variants.map(v => ({
        ...v,
        locationId: userLocationId
      }));
    }

    try {
      if (editingProduct) {
        if (!isAdmin) {
          toast.error('Only admins can edit products');
          return;
        }
        await api.put(`/products/${editingProduct.id}`, payload);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', payload);
        toast.success('Product created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (product) => {
    if (!isAdmin) {
      toast.error('Only admins can edit products');
      return;
    }
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      buyPrice: product.buyPrice,
      sellPrice: product.sellPrice,
      categoryId: product.categoryId,
      variants: product.variants.map(v => ({
        locationId: v.locationId,
        stockQuantity: v.stockQuantity
      }))
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      toast.error('Only admins can delete products');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, { locationId: '', stockQuantity: 0 }]
    });
  };

  const handleAddStock = async (variant) => {
    // Only allow employees to add stock to their branch
    if (!isAdmin && userLocationId !== variant.locationId) {
      toast.error('You can only add stock to your branch');
      return;
    }

    const quantity = prompt('Enter quantity to add:');

    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      toast.error('Invalid quantity');
      return;
    }

    try {
      await api.put(`/products/variants/${variant.id}/stock`, {
        stockQuantity: Number(quantity)
      });

      toast.success('Stock updated successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update stock');
    }
  };

  if (loading) {
    return (
      <Sidebar>
        <div className="p-6">Loading...</div>
      </Sidebar>
    );
  }
const handleExportExcel = async () => {
  setIsExporting(true);
  try {
    toast.loading('Preparing Excel file...', { id: 'export' });
    
    // Build query params with export options
    const params = new URLSearchParams();
    
    // Include current search if option is enabled
    if (exportOptions.includeSearch && debouncedSearch) {
      params.append('search', debouncedSearch);
    }
    
    // Location filter (only for admins)
    if (isAdmin && exportOptions.locationId) {
      params.append('locationId', exportOptions.locationId);
    }
    
    // Stock status filter
    if (exportOptions.stockStatus !== 'all') {
      params.append('stockStatus', exportOptions.stockStatus);
    }
    
    // Whether to include all locations in separate rows
    if (exportOptions.includeAllLocations) {
      params.append('includeAllLocations', 'true');
    }
    
    // Fetch the Excel file
    const response = await api.get(`/products/export-excel?${params.toString()}`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename with applied filters
    const filters = [];
    if (exportOptions.locationId) {
      const location = locations.find(l => l.id === exportOptions.locationId);
      filters.push(location?.name || 'location');
    }
    if (exportOptions.stockStatus !== 'all') {
      filters.push(exportOptions.stockStatus === 'in-stock' ? 'in-stock' : 'out-of-stock');
    }
    const filterSuffix = filters.length ? `_${filters.join('_')}` : '';
    const filename = `products${filterSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.setAttribute('download', filename);
    
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    toast.success('Export completed!', { id: 'export' });
    setShowExportModal(false);
  } catch (error) {
    console.error('Export failed:', error);
    toast.error('Failed to export products', { id: 'export' });
  } finally {
    setIsExporting(false);
  }
};

  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Inventory</h1>
<div className="flex justify-between items-center mb-6">
  <div className="flex gap-3">
    <button 
      onClick={() => setShowExportModal(true)} 
      className="btn-secondary flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
    >
      <Download className="w-5 h-5" />
      Export Excel
    </button>
    {isAdmin && (
      <button
        onClick={() => setShowModal(true)}
        className="btn-primary flex items-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Add Product
      </button>
    )}
  </div>
</div>
          </div>

          <div className="card overflow-x-auto">
            <div className="mb-4 flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full md:w-80"
              />
              
              {/* Location filter - only show for admins */}
                <select
                  value={selectedLocation}
                  onChange={handleLocationChange}
                  className="input-field w-48"
                >
                  <option value="">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              {/* Stock Filter Dropdown */}
<div className="flex items-center gap-2 mb-4">
  <label className="text-sm text-gray-600">Stock:</label>
  <select
    value={stockFilter}
    onChange={(e) => setStockFilter(e.target.value)}
    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
  >
    <option value="all">All Items</option>
    <option value="in-stock">In Stock</option>
    <option value="out-of-stock">Out of Stock</option>
  </select>
  
  {stockFilter === 'out-of-stock' && (
    <span className="text-xs text-red-500 font-medium">
      🔴 Showing items with zero stock
    </span>
  )}
</div>
{showExportModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Export Products</h2>
        <button onClick={() => setShowExportModal(false)} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="space-y-4">
        {/* Location Filter */}
        {isAdmin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Branch
            </label>
            <select
              value={exportOptions.locationId}
              onChange={(e) => setExportOptions({...exportOptions, locationId: e.target.value})}
              className="input-field"
            >
              <option value="">All Branches</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* Stock Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stock Status
          </label>
          <select
            value={exportOptions.stockStatus}
            onChange={(e) => setExportOptions({...exportOptions, stockStatus: e.target.value})}
            className="input-field"
          >
            <option value="all">All Products</option>
            <option value="in-stock">In Stock Only</option>
            <option value="out-of-stock">Out of Stock Only</option>
          </select>
        </div>
        
        {/* Include Search */}
        {debouncedSearch && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeSearch"
              checked={exportOptions.includeSearch}
              onChange={(e) => setExportOptions({...exportOptions, includeSearch: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="includeSearch" className="text-sm text-gray-700">
              Include current search filter: "{debouncedSearch}"
            </label>
          </div>
        )}
        
        {/* Include All Locations */}
        {isAdmin && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeAllLocations"
              checked={exportOptions.includeAllLocations}
              onChange={(e) => setExportOptions({...exportOptions, includeAllLocations: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="includeAllLocations" className="text-sm text-gray-700">
              Show each branch's stock in separate rows
            </label>
          </div>
        )}
        
        {/* Preview info */}
        <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
          <p className="font-medium mb-1">Export will include:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>SKU, product name, category</li>
            <li>Buy & sell prices</li>
            {exportOptions.includeAllLocations && <li>Branch/location column</li>}
            {!exportOptions.includeAllLocations && <li>Stock summary by branch</li>}
            <li>Date created</li>
          </ul>
        </div>
      </div>
      
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleExportExcel}
          disabled={isExporting}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export Now
            </>
          )}
        </button>
        <button
          onClick={() => setShowExportModal(false)}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
              
              {/* Show info for employees */}
              {!isAdmin && (
                <div className="px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                  👁️ Viewing inventory for all branches
                </div>
              )}
            </div>
            
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">SKU</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Buy Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Sell Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Stock</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{product.name}</td>
                      <td className="px-4 py-3 text-gray-600">{product.sku}</td>
                      <td className="px-4 py-3 text-gray-600">{product.category?.name}</td>
                      <td className="px-4 py-3 text-gray-600">KES {product.buyPrice?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">KES {product.sellPrice?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {product.variants && product.variants.length > 0 ? (
                          product.variants.map((v, idx) => (
                            <div key={idx} className="text-sm flex items-center justify-between mb-1">
                              <span>
                                {v.location?.name}: {v.stockQuantity}
                              </span>
                              {/* Only show add stock button for employees at their branch */}
                              {!isAdmin && userLocationId === v.locationId && (
                                <button
                                  onClick={() => handleAddStock(v)}
                                  className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                >
                                  + Stock
                                </button>
                              )}
                              {/* Admin can add stock to any branch */}
                              {isAdmin && (
                                <button
                                  onClick={() => handleAddStock(v)}
                                  className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                >
                                  + Stock
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400 italic">No stock</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="btn-secondary"
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="btn-secondary"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Add/Edit Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU *
                      {!editingProduct && (
                        <button
                          type="button"
                          onClick={handleGenerateNewSKU}
                          className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                          title="Generate new SKU"
                        >
                          <RefreshCw className="w-3 h-3 inline" /> Generate
                        </button>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.sku}
                      onChange={(e) => setFormData({...formData, sku: e.target.value})}
                      className="input-field"
                      disabled={!!editingProduct}
                      placeholder="Auto-generated SKU"
                    />
                    {!editingProduct && (
                      <p className="text-xs text-gray-500 mt-1">
                        SKU is auto-generated starting from 10000. You can edit it if needed.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Buy Price (KES) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.buyPrice}
                        onChange={(e) => setFormData({...formData, buyPrice: e.target.value})}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sell Price (KES) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.sellPrice ?? 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sellPrice: e.target.value === '' ? 0 : Number(e.target.value)
                        })
                      }
                      className="input-field"
                    />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      required
                      value={formData.categoryId}
                      onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                      className="input-field"
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Variants & Stock</label>
                    {formData.variants.map((variant, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <select
                          required
                          value={!isAdmin ? userLocationId : variant.locationId}
                          onChange={(e) => {
                            if (!isAdmin) return;
                            const newVariants = [...formData.variants];
                            newVariants[idx].locationId = e.target.value;
                            setFormData({ ...formData, variants: newVariants });
                          }}
                          className="input-field flex-1"
                          disabled={!isAdmin}
                        >
                          {!isAdmin ? (
                            <option value={userLocationId}>
                              {locations.find(l => l.id === userLocationId)?.name || 'Your Branch'}
                            </option>
                          ) : (
                            <>
                              <option value="">Select Location</option>
                              {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                              ))}
                            </>
                          )}
                        </select>
                        <input
                          type="number"
                          placeholder="Stock"
                          min="0"
                          value={variant.stockQuantity}
                          onChange={(e) => {
                            const newVariants = [...formData.variants];
                            newVariants[idx].stockQuantity = parseInt(e.target.value) || 0;
                            setFormData({...formData, variants: newVariants});
                          }}
                          className="input-field w-32"
                        />
                      </div>
                    ))}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={addVariant}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        + Add Another Location
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="submit" className="btn-primary flex-1">
                      {editingProduct ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
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
          
        </div>
        
      </div>
    </Sidebar>
    
  );
}