'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
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
    sellPrice: '',
    categoryId: '',
    variants: [{ locationId: '', stockQuantity: 0 }]
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
  const timeout = setTimeout(() => {
    setDebouncedSearch(searchQuery);
  }, 300); // 400ms delay

  return () => clearTimeout(timeout);
}, [searchQuery]);

useEffect(() => {
  fetchData();
}, [debouncedSearch, page]);

const resetForm = () => {
  setEditingProduct(null);
  setFormData({
    name: '',
    sku: '',
    buyPrice: '',
    sellPrice: '',
    categoryId: '',
    variants: [{ locationId: '', stockQuantity: 0 }]
  });
};

const fetchData = async () => {
  setLoading(true);
  try {
    const [locationsRes, categoriesRes] = await Promise.all([
      api.get('/locations'),
      api.get('/categories')
    ]);

    const productsRes = await api.get(
      `/products?search=${debouncedSearch}&page=${page}&limit=10`
    );

    setProducts(productsRes.data.data);
    setTotalPages(productsRes.data.totalPages);
    setLocations(locationsRes.data);
    setCategories(categoriesRes.data);
  } catch (error) {
    toast.error('Failed to load data');
  } finally {
    setLoading(false);
  }
};

// const fetchData = async () => {
//   try {
//     const [productsRes, locationsRes, categoriesRes] = await Promise.all([
//       api.get(`/products?search=${debouncedSearch}`),
//       api.get('/locations'),
//       api.get('/categories')
//     ]);

//     setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
//     setLocations(locationsRes.data);
//     setCategories(categoriesRes.data);
//   } catch (error) {
//     toast.error('Failed to load data');
//   } finally {
//     setLoading(false);
//   }
// };

const handleSubmit = async (e) => {
  e.preventDefault();

  let payload = { ...formData };

  // 🔒 Force employee location
  if (user?.role === 'EMPLOYEE') {
    payload.variants = payload.variants.map(v => ({
      ...v,
      locationId: user.locationId
    }));
  }

  try {
    if (editingProduct) {
      if (user?.role !== 'ADMIN') {
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
    if (user?.role !== 'ADMIN') {
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
    if (user?.role !== 'ADMIN') {
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

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const handleAddStock = async (variant) => {
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

  return (
    <Sidebar>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Inventory</h1>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>

        <div className="card overflow-x-auto">
          <div className="mb-4">
  <input
    type="text"
    placeholder="Search by name or SKU..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="input-field w-full md:w-80"
  />
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
                {user?.role === 'ADMIN' && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{product.name}</td>
                  <td className="px-4 py-3 text-gray-600">{product.sku}</td>
                  <td className="px-4 py-3 text-gray-600">{product.category.name}</td>
                  <td className="px-4 py-3 text-gray-600">KES {product.buyPrice.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">KES {product.sellPrice.toLocaleString()}</td>
                  <td className="px-4 py-3">
{product.variants.map((v, idx) => (
  <div key={idx} className="text-sm flex items-center justify-between">
    <span>
      {v.location.name}: {v.stockQuantity}
    </span>

    {user?.role === 'EMPLOYEE' && user.locationId === v.locationId && (
      <button
        onClick={() => handleAddStock(v)}
        className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
      >
        + Stock
      </button>
    )}
  </div>
))}
                  </td>
                  {user?.role === 'ADMIN' && (
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
              ))}
            </tbody>
          </table>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="input-field"
                    disabled={!!editingProduct}
                  />
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
                      value={formData.sellPrice}
                      onChange={(e) => setFormData({...formData, sellPrice: e.target.value})}
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
  value={
    user?.role === 'EMPLOYEE'
      ? user.locationId
      : variant.locationId
  }
  onChange={(e) => {
    if (user?.role === 'EMPLOYEE') return;

    const newVariants = [...formData.variants];
    newVariants[idx].locationId = e.target.value;
    setFormData({ ...formData, variants: newVariants });
  }}
  className="input-field flex-1"
  disabled={user?.role === 'EMPLOYEE'}
>
  {user?.role === 'EMPLOYEE' ? (
    <option value={user.locationId}>
      {locations.find(l => l.id === user.locationId)?.name || 'Your Branch'}
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
                  <button
                    type="button"
                    onClick={addVariant}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    + Add Another Location
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    {editingProduct ? 'Update' : 'Create'}
                  </button>
<button
  type="button"
  onClick={() => {
    setShowModal(false);
    resetForm(); // resets all fields
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