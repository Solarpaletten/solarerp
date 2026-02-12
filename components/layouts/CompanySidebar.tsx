'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

type CompanySidebarProps = {
  children: React.ReactNode;
  companyId: string;
  companyName: string;
};

type NavItem = {
  name: string;
  href: string;
  icon: string;
};

export function CompanySidebar({ children, companyId, companyName }: CompanySidebarProps) {
  const pathname = usePathname();

  const basePath = `/account/companies/${companyId}`;

  const navItems: NavItem[] = [
    { name: 'Dashboard', href: basePath, icon: '📊' },
    { name: 'Clients', href: `${basePath}/clients`, icon: '👥' },
    { name: 'Items', href: `${basePath}/items`, icon: '📦' },
    { name: 'Sales', href: `${basePath}/sales`, icon: '💰' },
    { name: 'Purchases', href: `${basePath}/purchases`, icon: '🛒' },
    { name: 'Warehouse', href: `${basePath}/warehouse`, icon: '🏭' },
    { name: 'Bank', href: `${basePath}/bank`, icon: '🏦' },
    { name: 'Reports', href: `${basePath}/reports`, icon: '📈' },
  ];

  const isActive = (href: string) => {
    if (href === basePath) {
      return pathname === basePath;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Link
            href="/account/companies"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
          >
            <span>←</span>
            <span>Back to Companies</span>
          </Link>
          <h2 className="text-lg font-bold text-gray-900 truncate">{companyName}</h2>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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

        <div className="p-4 border-t border-gray-200 text-xs text-gray-400">
          Company ID: {companyId.slice(0, 8)}...
        </div>
      </aside>

      <main className="flex-1 bg-gray-50">
        {children}
      </main>
    </div>
  );
}

export default CompanySidebar;

