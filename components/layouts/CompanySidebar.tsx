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
    if (href === basePath) return pathname === basePath;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Company Header */}
        <div className="p-4 border-b border-gray-100">
          <Link
            href="/account/companies"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2"
          >
            <span>←</span>
            <span>All Companies</span>
          </Link>
          <h2 className="text-base font-bold text-gray-900 truncate" title={companyName}>
            {companyName}
          </h2>
        </div>

        {/* ERP Module Navigation */}
        <nav className="flex-1 p-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-4 mb-2">Modules</p>
          <ul className="space-y-0.5">
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

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 truncate" title={companyId}>
            ID: {companyId.slice(0, 12)}...
          </p>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 bg-gray-50 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default CompanySidebar;
