'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  Package,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Receipt,
  Wallet,
  Truck,
  BarChart3
} from 'lucide-react';

export default function SidebarLayout({ children }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'POS', href: '/pos', icon: ShoppingCart },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Sales', href: '/sales', icon: Receipt },
    { name: 'Expenses', href: '/expenses', icon: Wallet },
    ...(user?.role === 'ADMIN' ? [
      { name: 'Transfers', href: '/transfers', icon: Truck },
      { name: 'Reports', href: '/reports', icon: BarChart3 }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header with menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Kenya POS</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar - always visible on desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg 
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:fixed
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar header */}
        <div className="h-16 flex items-center px-6 border-b">
          <h1 className="text-xl font-bold text-gray-800">Kenya POS</h1>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b">
          <p className="text-sm font-medium text-gray-900">{user?.username}</p>
          <p className="text-sm text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center px-4 py-3 rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-primary-50 text-primary-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main content - with left margin on desktop */}
      <div className="lg:ml-64 min-h-screen">
        {/* Mobile spacer */}
        <div className="h-16 lg:hidden"></div>
        
        {/* Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {/* Overlay for mobile */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          {children}
        </main>
      </div>
    </div>
  );
}