'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Link from 'next/link';
import { ShoppingCart, Package, TrendingUp, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/Sidebar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todaySales: 0,
    todayRevenue: 0,
    lowStockItems: 0,
    totalProducts: 0
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userLocationId, setUserLocationId] = useState(null);
  const [stockGrowthData, setStockGrowthData] = useState([]);

  useEffect(() => {
    if (user) {
      setIsAdmin(user.role === 'ADMIN');
      setUserLocationId(user.locationId);
      console.log('User:', { 
        role: user.role, 
        locationId: user.locationId,
        username: user.username 
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Fetch stock growth data for dashboard
  useEffect(() => {
    const fetchStockGrowth = async () => {
      try {
        const res = await api.get('/products/stock-growth');
        setStockGrowthData(res.data.data || []);
      } catch (error) {
        toast.error('Failed to load stock growth data');
      }
    };
    fetchStockGrowth();
  }, []);

const fetchDashboardData = async () => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [salesRes, productsRes] = await Promise.all([
      api.get(`/sales?startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`),
      api.get('/products?page=1&limit=1000')
    ]);

    const allSales = Array.isArray(salesRes.data.data) ? salesRes.data.data : [];
    const allProducts = Array.isArray(productsRes.data.data) ? productsRes.data.data : [];

    // For employees, filter to their branch only
    const isEmployee = user?.role === 'EMPLOYEE';
    const locationId = user?.locationId;

    const sales = isEmployee
      ? allSales.filter(sale => sale.locationId === locationId)
      : allSales;

    const products = isEmployee
      ? allProducts.filter(p => p.variants.some(v => v.locationId === locationId))
      : allProducts;

    const todayRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);

    let lowStockCount = 0;
    products.forEach(product => {
      const variants = isEmployee
        ? product.variants.filter(v => v.locationId === locationId)
        : product.variants;
      variants.forEach(variant => {
        if (variant.stockQuantity < 5) lowStockCount++;
      });
    });

    setStats({
      todaySales: sales.length,
      todayRevenue,
      lowStockItems: lowStockCount,
      totalProducts: products.length
    });
  } catch (error) {
    toast.error('Failed to load dashboard data');
    console.error(error);
  } finally {
    setLoading(false);
  }
};

  const statCards = [
    {
      title: "Today's Sales",
      value: stats.todaySales,
      icon: ShoppingCart,
      color: 'bg-blue-500'
    },
    {
      title: "Today's Revenue",
      value: `KES ${stats.todayRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-purple-500'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: TrendingUp,
      color: stats.lowStockItems > 0 ? 'bg-red-500' : 'bg-yellow-500'
    }
  ];

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl">Loading...</div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-600">Welcome back, {user?.username}!</p>
          {!isAdmin && userLocationId && (
            <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm text-blue-700">
                📍 Showing data for: <strong>{userLocationId === 'tmall-branch' ? 'Tmall branch' : 'CBD branch'}</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                You can only view data for your assigned branch
              </p>
            </div>
          )}
          {isAdmin && (
            <div className="mt-2 p-3 bg-green-50 border-l-4 border-green-500 rounded">
              <p className="text-sm text-green-700">
                👑 Admin view - Showing data for all branches
              </p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.title} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stock Growth Chart */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" /> Stock Growth (Month-on-Month)
          </h3>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stockGrowthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} label={{ value: 'Total Stock', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="totalStock" stroke="#2563eb" strokeWidth={2} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/pos" className="bg-primary-600 text-white text-center py-4 rounded-lg hover:bg-primary-700 transition-colors">
              New Sale
            </Link>
            <Link href="/inventory" className="bg-gray-200 text-gray-800 text-center py-4 rounded-lg hover:bg-gray-300 transition-colors">
              View Inventory
            </Link>
            {user?.role === 'ADMIN' && (
              <Link href="/reports" className="bg-gray-200 text-gray-800 text-center py-4 rounded-lg hover:bg-gray-300 transition-colors">
                View Reports
              </Link>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}