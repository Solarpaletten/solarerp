// components/layouts/CompanySwitcher.tsx
// TASK 59 — Company Switcher UI
// Stores active company in localStorage (client-side only)
// Aborts in-flight requests on company switch

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { setActiveCompany } from '@/lib/api/apiClient';

export { setActiveCompany } from '@/lib/api/apiClient';
export { clearActiveCompany } from '@/lib/api/apiClient';

const ACTIVE_COMPANY_KEY = 'solar_active_company_id';

export function useActiveCompany(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_COMPANY_KEY);
}

interface Company {
  id: string;
  name: string;
  country: string;
  legalType?: string;
  currencyCode: string;
  role: string;
}

export function CompanySwitcher() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [open, setOpen]           = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setActiveId(localStorage.getItem(ACTIVE_COMPANY_KEY));
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      const res = await fetch('/api/account/companies', { credentials: 'include' });
      if (res.status === 401) { router.replace('/login'); return; }
      if (!res.ok) return;
      const { data } = await res.json();
      setCompanies(data || []);
      if (!data || data.length === 0) router.replace('/account/onboarding');
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(company: Company) {
    setActiveCompany(company.id); // ← aborts previous company requests
    setActiveId(company.id);
    setOpen(false);
    router.push(`/company/${company.id}/dashboard`);
  }

  const active = companies.find(c => c.id === activeId);

  if (loading) return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400">
      <Building2 size={16} /><span>Loading...</span>
    </div>
  );

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-gray-100">
        <div className="w-8 h-8 rounded-md bg-blue-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">
          {active ? active.name[0].toUpperCase() : <Building2 size={14} />}
        </div>
        <div className="flex-1 min-w-0 text-left">
          {active
            ? <><p className="text-sm font-medium text-gray-900 truncate">{active.name}</p>
                <p className="text-xs text-gray-500">{active.country} · {active.currencyCode}</p></>
            : <p className="text-sm text-gray-500">Select company</p>}
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {companies.map(c => (
                <button key={c.id} onClick={() => handleSelect(c)}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-700 text-sm font-semibold flex items-center justify-center shrink-0">
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.legalType} · {c.country} · {c.role}</p>
                  </div>
                  {c.id === activeId && <Check size={16} className="text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100">
              <button onClick={() => { setOpen(false); router.push('/account/onboarding'); }}
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-blue-600 hover:bg-blue-50">
                <Plus size={16} /> Add new company
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
