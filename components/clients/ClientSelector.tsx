// components/clients/ClientSelector.tsx
// ═══════════════════════════════════════════════════
// Task 51: Client Selector — searchable dropdown
// ═══════════════════════════════════════════════════
// Used in PurchaseHeaderEdit (supplier) and SalesHeaderEdit (customer)

'use client';

import { useState, useEffect, useRef } from 'react';

export interface ClientOption {
  id: string;
  name: string;
  code: string | null;
  vatCode: string | null;
  payWithinDays: number | null;
}

type Props = {
  companyId: string;
  value: string;
  onSelect: (client: ClientOption) => void;
  placeholder?: string;
  className?: string;
};

const clientCache = new Map<string, { data: ClientOption[]; ts: number }>();
const CACHE_TTL = 60_000;

async function fetchClients(companyId: string): Promise<ClientOption[]> {
  const cached = clientCache.get(companyId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const res = await fetch(`/api/company/${companyId}/clients?pageSize=100&isActive=true`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  const clients: ClientOption[] = (json.data || []).map((c: Record<string, unknown>) => ({
    id: String(c.id),
    name: String(c.name || ''),
    code: c.code ? String(c.code) : null,
    vatCode: c.vatCode ? String(c.vatCode) : null,
    payWithinDays: c.payWithinDays != null ? Number(c.payWithinDays) : null,
  }));
  clientCache.set(companyId, { data: clients, ts: Date.now() });
  return clients;
}

export function ClientSelector({ companyId, value, onSelect, placeholder = 'Select client...', className }: Props) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [inputValue, setInputValue] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputValue(value); }, [value]);
  useEffect(() => { fetchClients(companyId).then(setClients); }, [companyId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.code && c.code.toLowerCase().includes(q));
  });

  const handleSelect = (client: ClientOption) => {
    setInputValue(client.name);
    setSearch('');
    setOpen(false);
    onSelect(client);
  };

  return (
    <div ref={ref} className="relative">
      <input
        className={className || "w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-400"}
        value={open ? search : inputValue}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setSearch(''); }}
        onChange={e => { setSearch(e.target.value); if (!open) setOpen(true); }}
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">No clients found</div>
          ) : (
            filtered.map(c => (
              <button key={c.id} type="button"
                onClick={() => handleSelect(c)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex items-center justify-between">
                <span>
                  <span className="font-medium text-gray-900">{c.name}</span>
                  {c.code && <span className="ml-2 text-xs text-gray-400 font-mono">({c.code})</span>}
                </span>
                {c.vatCode && <span className="text-xs text-gray-400">{c.vatCode}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
