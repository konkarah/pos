'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Link from 'next/link';
import { ShoppingCart, Package, TrendingUp, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/Sidebar';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todaySales: 0,
    todayRevenue: 0,
    lowStockItems: 0,
    totalProducts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
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
      api.get('/products?page=1&limit=1000') // fetch all products for dashboard stats
    ]);

    const sales = Array.isArray(salesRes.data.data) ? salesRes.data.data : [];
    const products = Array.isArray(productsRes.data.data) ? productsRes.data.data : [];

    const todayRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);

    // Count low stock items (less than 5)
    let lowStockCount = 0;
    products.forEach(product => {
      product.variants.forEach(variant => {
        if (variant.stockQuantity < 5) lowStockCount++;
      });
    });

    setStats({
      todaySales: sales.length || 0,
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