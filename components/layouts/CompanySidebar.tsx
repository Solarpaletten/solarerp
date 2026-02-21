// components/layouts/CompanySidebar.tsx
// ═══════════════════════════════════════════════════
// Company Sidebar — Factory-compatible
// ERP module navigation with active state highlighting
// ═══════════════════════════════════════════════════
//
// FIXED (Task 18):
// - base: /account/companies/${companyId} → /company/${companyId}
// - Dashboard route: base → base/dashboard
// - Routes match actual file structure under app/(dashboard)/company/[companyId]/

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

type Props = {
  companyId: string;
  companyName: string;
  children: React.ReactNode;
};

type NavGroup = {
  label: string;
  items: { name: string; href: string; icon: string }[];
};

export function CompanySidebar({ companyId, companyName, children }: Props) {
  const pathname = usePathname();
  const base = `/company/${companyId}`;

  const groups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard',  href: `${base}/dashboard`,   icon: '📊' },
      ],
    },
    {
      label: 'Commerce',
      items: [
        { name: 'Clients',    href: `${base}/clients`,     icon: '👥' },
        { name: 'Products',   href: `${base}/products`,    icon: '📦' },
        { name: 'Sales',      href: `${base}/sales`,       icon: '💰' },
        { name: 'Purchases',  href: `${base}/purchases`,   icon: '🛒' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { name: 'Warehouse',  href: `${base}/warehouse`,   icon: '🏭' },
        { name: 'Bank',       href: `${base}/bank`,        icon: '🏦' },
        { name: 'Reports',    href: `${base}/reports`,     icon: '📈' },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === `${base}/dashboard`) {
      // Dashboard active on exact match or bare /company/[id]
      return pathname === href || pathname === base;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Company header */}
        <div className="p-4 border-b border-gray-100">
          <Link href="/account/companies"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2">
            ← All Companies
          </Link>
          <h2 className="text-sm font-bold text-gray-900 truncate" title={companyName}>{companyName}</h2>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {groups.map(group => (
            <div key={group.label} className="mb-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1.5">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map(item => (
                  <li key={item.href}>
                    <Link href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}>
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 text-center">Solar ERP v0.1</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        {children}
      </main>
    </div>
  );
}
