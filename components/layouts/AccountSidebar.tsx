'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

type AccountSidebarProps = {
  children: React.ReactNode;
};

type NavItem = {
  name: string;
  href: string;
  icon: string;
};

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/account/dashboard', icon: '📊' },
  { name: 'Companies', href: '/account/companies', icon: '🏢' },
];

export function AccountSidebar({ children }: AccountSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Factory auth: read from localStorage
    const email = localStorage.getItem('userEmail');
    setUserEmail(email);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('userEmail');
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/account/dashboard') return pathname === '/account/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <Link href="/account/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">☀️</span>
            <span className="text-lg font-bold text-gray-900">Solar ERP</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 mt-1">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-gray-100">
          {userEmail && (
            <p className="text-xs text-gray-400 mb-3 px-2 truncate" title={userEmail}>
              {userEmail}
            </p>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default AccountSidebar;
