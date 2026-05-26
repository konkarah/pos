'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, Trash2, Phone, Calendar } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function POSPage() {
  // const [products, setProducts] = useState([]);
  // const [cart, setCart] = useState([]);
  // const [searchQuery, setSearchQuery] = useState('');
  // const [selectedLocation, setSelectedLocation] = useState('');
  // const [locations, setLocations] = useState([]);
  // const [customerName, setCustomerName] = useState('');
  // const [customerPhone, setCustomerPhone] = useState(''); // NEW STATE
  // const [paymentMethod, setPaymentMethod] = useState('CASH');
  // const [processing, setProcessing] = useState(false);
    const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [locations, setLocations] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [processing, setProcessing] = useState(false);
   const [saleDate, setSaleDate] = useState(''); 
   const [currentUser, setCurrentUser] = useState(null);

   useEffect(() => {
  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me'); // Adjust endpoint to your auth setup
      setCurrentUser(res.data);
      
      // Auto-select user's location if they're an employee
      if (res.data.role === 'EMPLOYEE' && res.data.locationId) {
        setSelectedLocation(res.data.locationId);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };
  fetchCurrentUser();
}, []);

// Update fetchData to respect employee location lock
useEffect(() => {
  if (!currentUser) return; // wait for user to load before any fetch

  const delay = setTimeout(() => {
    fetchData();
  }, 800);

  return () => clearTimeout(delay);
}, [searchQuery, selectedLocation, currentUser]);
useEffect(() => {
  if (currentUser?.role !== 'EMPLOYEE' && locations.length > 0 && !selectedLocation) {
    setSelectedLocation(locations[0].id);
  }
}, [locations, currentUser]);

// 1. init
useEffect(() => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  // setSaleDate(now.toISOString().slice(0, 16)); 
}, []);


//   const fetchData = async () => {
//   try {
//     const [productsRes, locationsRes] = await Promise.all([
//       api.get(
//         `/products?search=${searchQuery}&page=1&limit=20&locationId=${selectedLocation}`
//       ),
//       api.get('/locations')
//     ]);

//     setProducts(
//       Array.isArray(productsRes.data.data)
//         ? productsRes.data.data
//         : []
//     );

//     setLocations(locationsRes.data);

//     // only set location once (avoid infinite refetch)
//     if (!selectedLocation && locationsRes.data.length > 0) {
//       setSelectedLocation(locationsRes.data[0].id);
//     }

//   } catch (error) {
//     toast.error('Failed to load data');
//     console.error(error);
//   }
// };
const fetchData = async () => {
  const locationId =
    currentUser?.role === 'EMPLOYEE'
      ? currentUser.locationId
      : selectedLocation; // empty string = fetch all (backend handles it)

  try {
    const [productsRes, locationsRes] = await Promise.all([
      api.get(`/products?search=${encodeURIComponent(searchQuery)}&page=1&limit=20&locationId=${selectedLocation}`),
      api.get('/locations')
    ]);

    setProducts(Array.isArray(productsRes.data.data) ? productsRes.data.data : []);
    setLocations(locationsRes.data);
    // ← removed the setSelectedLocation call that was causing extra fetches
  } catch (error) {
    toast.error('Failed to load data');
    console.error(error);
  }
};
const filteredProducts = products.filter(product => {
  if (!selectedLocation) return false;

  // Find variant for this branch
  const variant = product.variants.find(
    v => v.locationId === selectedLocation
  );

  // Only show if variant exists (and optionally has stock)
  return variant;
});

  // const filteredProducts = products.filter(product => {
  //   const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //                        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
  //   if (!selectedLocation) return matchesSearch;
    
  //   const hasStock = product.variants.some(v => 
  //     v.locationId === selectedLocation && v.stockQuantity > 0
  //   );
    
  //   return matchesSearch && hasStock;
  // });

  const addToCart = (product, variant) => {
    const existingItem = cart.find(item => item.variant.id === variant.id);
    
    if (existingItem) {
      if (existingItem.quantity >= variant.stockQuantity) {
        toast.error('Not enough stock available');
        return;
      }
      setCart(cart.map(item =>
        item.variant.id === variant.id
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      setCart([...cart, {
        product,
        variant,
        quantity: 1,
        unitPrice: product.sellPrice,
        subtotal: product.sellPrice
      }]);
    }
  };

  const removeFromCart = (variantId) => {
    setCart(cart.filter(item => item.variant.id !== variantId));
  };

  const updateQuantity = (variantId, quantity) => {
    if (quantity < 1) return;
    const item = cart.find(i => i.variant.id === variantId);
    if (quantity > item.variant.stockQuantity) {
      toast.error('Not enough stock available');
      return;
    }
    setCart(cart.map(item =>
      item.variant.id === variantId
        ? { ...item, quantity, subtotal: quantity * item.unitPrice }
        : item
    ));
  };

  const updateUnitPrice = (variantId, newPrice) => {
    const price = parseFloat(newPrice);
    if (newPrice === '') {
       setCart(cart.map(item =>
        item.variant.id === variantId ? { ...item, unitPrice: 0, subtotal: 0 } : item
      ));
      return;
    }
    if (isNaN(price) || price < 0) return;

    setCart(cart.map(item =>
      item.variant.id === variantId
        ? { ...item, unitPrice: price, subtotal: item.quantity * price }
        : item
    ));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!selectedLocation) {
      toast.error('Please select a location');
      return;
    }

    if (!saleDate) {
      toast.error('Please select a sale date');
      return;
    }

    const selectedDateTime = new Date(saleDate);
    const now = new Date();

    // Optional: Prevent future dates (remove if you allow future scheduling)
    if (selectedDateTime > now) {
      toast.error('Sale date cannot be in the future');
      return;
    }

    // Simple phone validation
    if (customerPhone && !/^\+?[0-9]{10,15}$/.test(customerPhone.replace(/\s|-/g, ''))) {
      toast.error('Please enter a valid phone number (10-15 digits)');
      return;
    }

    setProcessing(true);
    try {
      const saleData = {
        locationId: selectedLocation,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        saleDate: selectedDateTime.toISOString(), // SEND SPECIFIC DATE
        totalAmount,
        paymentMethod,
        items: cart.map(item => ({
          productVariantId: item.variant.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal
        }))
      };

      const response = await api.post('/sales', saleData);
      
      const receiptBlob = new Blob([Buffer.from(response.data.receipt, 'base64')], { type: 'application/pdf' });
      const receiptUrl = window.URL.createObjectURL(receiptBlob);
      const link = document.createElement('a');
      link.href = receiptUrl;
      link.download = `${response.data.sale.receiptNumber}.pdf`;
      link.click();

      toast.success(`Sale recorded for ${selectedDateTime.toLocaleString()}!`);
      
      // Reset form but keep location
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      
      // Reset date to now or keep the selected one? Usually reset to now.
      // const nowReset = new Date();
      // nowReset.setMinutes(nowReset.getMinutes() - nowReset.getTimezoneOffset());
      // setSaleDate(nowReset.toISOString().slice(0, 16));
      
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to process sale');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Point of Sale</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products Section */}
            <div className="lg:col-span-2 space-y-4">
              <div className="card flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-10"
                  />
                </div>
<select
  value={selectedLocation}
  onChange={(e) => setSelectedLocation(e.target.value)}
  className="input-field w-48"
  disabled={currentUser?.role === 'EMPLOYEE'}
>
  {currentUser?.role === 'EMPLOYEE' ? (
    <option value={currentUser.locationId}>
      {locations.find(l => l.id === currentUser.locationId)?.name || 'Your Branch'}
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
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* {products.map(product => {
                  const variant = product.variants.find(v => v.locationId === selectedLocation);
                  const inStock = variant && variant.stockQuantity > 0;
                  
                  return (
                    <div
                      key={product.id}
                      onClick={() => inStock && addToCart(product, variant)}
                      className={`card cursor-pointer transition-all ${
                        inStock ? 'hover:shadow-lg hover:-translate-y-1' : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <h3 className="font-semibold text-gray-800">{product.name}</h3>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                      {variant && (
                        <p className={`text-sm mt-2 ${inStock ? 'text-green-600' : 'text-red-600'}`}>
                          Stock: {variant.stockQuantity}
                        </p>
                      )}
                      <p className="text-lg font-bold text-primary-600 mt-2">
                        KES {product.sellPrice.toLocaleString()}
                      </p>
                    </div>
                  );
                })} */}
                {filteredProducts.map(product => {
                  const variant = product.variants.find(v => v.locationId === selectedLocation);
                  const inStock = variant && variant.stockQuantity > 0;
                  
                  return (
                    <div
                      key={product.id}
                      onClick={() => inStock && addToCart(product, variant)}
                      className={`card cursor-pointer transition-all ${
                        inStock ? 'hover:shadow-lg hover:-translate-y-1' : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <h3 className="font-semibold text-gray-800">{product.name}</h3>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                      <p className="text-sm text-gray-600">Buy Price: {product.buyPrice.toLocaleString()}</p>
                      {variant && (
                        <p className={`text-sm mt-2 ${inStock ? 'text-green-600' : 'text-red-600'}`}>
                          Stock: {variant.stockQuantity}
                        </p>
                      )}
                      <p className="text-lg font-bold text-primary-600 mt-2">
                        KES {product.sellPrice.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cart Section */}
            <div className="card">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Cart</h2>
              
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty</p>
              ) : (
                <>
                  <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
                    {cart.map(item => {
                      const priceChanged = item.unitPrice !== item.product.sellPrice;
                      return (
                        <div key={item.variant.id} className="border-b pb-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{item.product.name}</p>
                              {item.variant.variantValue && (
                                <p className="text-xs text-gray-500">{item.variant.variantValue}</p>
                              )}
                            </div>
                            <button onClick={() => removeFromCart(item.variant.id)} className="text-red-500 hover:text-red-700 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border rounded w-24">
                              <button onClick={() => updateQuantity(item.variant.id, item.quantity - 1)} className="px-2 py-1 hover:bg-gray-100">-</button>
                              <span className="flex-1 text-center text-sm">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.variant.id, item.quantity + 1)} className="px-2 py-1 hover:bg-gray-100">+</button>
                            </div>
                            <div className="flex-1 relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">KES</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateUnitPrice(item.variant.id, e.target.value)}
                                className={`w-full pl-8 pr-2 py-1 border rounded text-sm text-right font-medium ${
                                  priceChanged ? 'bg-yellow-50 border-yellow-400 text-orange-700' : 'bg-white'
                                }`}
                              />
                            </div>
                          </div>
                          <div className="mt-2 text-right text-sm font-bold text-gray-700">
                            Subtotal: KES {item.subtotal.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    {/* Customer Details & Date Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="input-field text-sm py-2"
                          placeholder="Name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="input-field text-sm py-2 pl-9"
                            placeholder="0712345678"
                          />
                        </div>
                      </div>
                    </div>

                    {/* NEW: Sale Date Input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Sale Date & Time</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="datetime-local"
                          value={saleDate}
                          onChange={(e) => setSaleDate(e.target.value)}
                          className="input-field text-sm py-2 pl-9 w-full"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Defaults to now. Adjust for back-dating.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="input-field text-sm py-2"
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

                    <div className="flex justify-between items-center text-xl font-bold pt-2">
                      <span>Total:</span>
                      <span className="text-primary-600">KES {totalAmount.toLocaleString()}</span>
                    </div>

                    <button
                      onClick={processSale}
                      disabled={processing}
                      className="w-full btn-primary py-3 text-lg font-bold"
                    >
                      {processing ? 'Processing...' : 'Complete Sale'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}