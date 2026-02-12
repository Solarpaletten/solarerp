'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import React from 'react';

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

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('tenantId');
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/account/dashboard') {
      return pathname === '/account/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <Link href="/account/dashboard" className="text-xl font-bold text-blue-600">
            Solar ERP
          </Link>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50">
        {children}
      </main>
    </div>
  );
}

export default AccountSidebar;

