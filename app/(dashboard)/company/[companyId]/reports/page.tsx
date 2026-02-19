// ERP Module placeholder — Factory-compatible
// Shared page template for: clients, products, sales, purchases, warehouse, bank, reports

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

const MODULE_META: Record<string, { title: string; icon: string; description: string }> = {
  clients:    { title: 'Clients',    icon: '👥', description: 'Manage your client base, contacts, and payment terms' },
  products:   { title: 'Products',   icon: '📦', description: 'Product catalog, pricing, and inventory items' },
  sales:      { title: 'Sales',      icon: '💰', description: 'Sales orders, invoices, and revenue tracking' },
  purchases:  { title: 'Purchases',  icon: '🛒', description: 'Purchase orders, supplier invoices, and procurement' },
  warehouse:  { title: 'Warehouse',  icon: '🏭', description: 'Stock movements, inventory levels, and warehouses' },
  bank:       { title: 'Bank',       icon: '🏦', description: 'Bank statements, payments, and reconciliation' },
  reports:    { title: 'Reports',    icon: '📈', description: 'Financial reports, analytics, and business intelligence' },
};

export default function ModulePage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const segments = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
  const moduleKey = segments[segments.length - 1] || 'unknown';
  const meta = MODULE_META[moduleKey] || { title: moduleKey, icon: '📋', description: 'ERP Module' };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href={`/account/companies/${companyId}`}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Dashboard</Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <span className="text-5xl block mb-4">{meta.icon}</span>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{meta.title}</h1>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">{meta.description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm">
          🚧 Module under development
        </div>
      </div>
    </div>
  );
}
