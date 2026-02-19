// app/account/companies/[companyId]/page.tsx
// Company Dashboard — Factory-compatible
// Data: from Factory API (/api/companies/[id])
// No runtime dependencies
//
// FIX: Added x-user-id header to fetch call.
// Without this header, /api/companies/[id] returns 401.

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type CompanyData = {
  id: string;
  name: string;
  code: string | null;
  vatNumber: string | null;
  country: string | null;
  status: string;
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'text-emerald-600 bg-emerald-50',
  FROZEN: 'text-amber-600 bg-amber-50',
  ARCHIVED: 'text-gray-500 bg-gray-100',
};

export default function CompanyDashboard() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ═══════════════════════════════════════════════
    // FIX: Auth guard + x-user-id header
    // ═══════════════════════════════════════════════
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.replace('/login');
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`/api/companies/${companyId}`, {
          headers: { 'x-user-id': userId },
        });
        if (res.status === 401) {
          localStorage.removeItem('userId');
          router.replace('/login');
          return;
        }
        if (res.ok) setCompany(await res.json());
      } catch { /* fallback */ }
      finally { setLoading(false); }
    };
    load();
  }, [companyId, router]);

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>;
  }

  if (!company) {
    return <div className="p-8"><p className="text-red-500">Company not found</p></div>;
  }

  const base = `/account/companies/${companyId}`;

  const modules = [
    { name: 'Clients',    icon: '👥', href: `${base}/clients`,    count: '—' },
    { name: 'Products',   icon: '📦', href: `${base}/products`,   count: '—' },
    { name: 'Sales',      icon: '💰', href: `${base}/sales`,      count: '—' },
    { name: 'Purchases',  icon: '🛒', href: `${base}/purchases`,  count: '—' },
    { name: 'Warehouse',  icon: '🏭', href: `${base}/warehouse`,  count: '—' },
    { name: 'Bank',       icon: '🏦', href: `${base}/bank`,       count: '—' },
  ];

  const stats = [
    { label: 'Monthly Revenue', value: '€0',  icon: '💰', gradient: 'from-emerald-500 to-emerald-600' },
    { label: 'Active Clients',  value: '0',   icon: '👥', gradient: 'from-blue-500 to-blue-600' },
    { label: 'Open Orders',     value: '0',   icon: '📋', gradient: 'from-orange-500 to-orange-600' },
    { label: 'Stock Items',     value: '0',   icon: '📦', gradient: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className="p-6">
      {/* Company Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{company.name}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {company.code && <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{company.code}</span>}
              {company.vatNumber && <span>VAT: {company.vatNumber}</span>}
              {company.country && <span>{company.country}</span>}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[company.status] || ''}`}>
            {company.status}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(stat => (
          <div key={stat.label} className={`bg-gradient-to-r ${stat.gradient} rounded-xl p-5 text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs mb-1">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <span className="text-3xl opacity-80">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ERP Modules Grid */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4">ERP Modules</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {modules.map(mod => (
          <Link key={mod.name} href={mod.href}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all text-center group">
            <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">{mod.icon}</span>
            <p className="text-sm font-medium text-gray-700">{mod.name}</p>
            <p className="text-xs text-gray-400 mt-1">{mod.count}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">🚀 Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href={`${base}/clients`} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium text-gray-700">
              <span>👥</span> Add Client
            </Link>
            <Link href={`${base}/products`} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium text-gray-700">
              <span>📦</span> Add Product
            </Link>
            <Link href={`${base}/sales`} className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium text-gray-700">
              <span>💰</span> New Sale
            </Link>
            <Link href={`${base}/purchases`} className="flex items-center gap-2 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium text-gray-700">
              <span>🛒</span> New Purchase
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">📈 Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3">☀</div>
              <div>
                <p className="text-sm font-medium text-gray-800">System initialized</p>
                <p className="text-xs text-gray-500">Company workspace created</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center py-2">Activity will appear as you use the system</p>
          </div>
        </div>
      </div>
    </div>
  );
}
