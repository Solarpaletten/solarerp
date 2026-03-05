// components/products/ProductSelector.tsx
// ═══════════════════════════════════════════════════
// Task 51: Product Selector — searchable dropdown
// ═══════════════════════════════════════════════════
// Used in PurchaseItemsEdit and SalesItemsEdit
// Loads products once, provides search, autofills fields

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface ProductOption {
  id: string;
  name: string;
  code: string | null;
  unitName: string;
  vatRate: number | null;
  priceWithoutVat: number | null;
}

type Props = {
  companyId: string;
  value: string; // current itemName display
  onSelect: (product: ProductOption) => void;
  placeholder?: string;
  className?: string;
};

// Cache products per companyId to avoid refetching
const productCache = new Map<string, { data: ProductOption[]; ts: number }>();
const CACHE_TTL = 60_000; // 1 min

async function fetchProducts(companyId: string): Promise<ProductOption[]> {
  const cached = productCache.get(companyId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const res = await fetch(`/api/company/${companyId}/products?pageSize=100`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  const products: ProductOption[] = (json.data || []).map((p: Record<string, unknown>) => ({
    id: String(p.id),
    name: String(p.name || ''),
    code: p.code ? String(p.code) : null,
    unitName: String(p.unitName || 'pcs'),
    vatRate: p.vatRate != null ? Number(p.vatRate) : null,
    priceWithoutVat: p.priceWithoutVat != null ? Number(p.priceWithoutVat) : null,
  }));
  productCache.set(companyId, { data: products, ts: Date.now() });
  return products;
}

export function ProductSelector({ companyId, value, onSelect, placeholder = 'Select product...', className }: Props) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [inputValue, setInputValue] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputValue(value); }, [value]);

  useEffect(() => {
    fetchProducts(companyId).then(setProducts);
  }, [companyId]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q));
  });

  const handleSelect = (product: ProductOption) => {
    setInputValue(product.name);
    setSearch('');
    setOpen(false);
    onSelect(product);
  };

  return (
    <div ref={ref} className="relative">
      <input
        className={className || "w-full text-sm border-0 focus:ring-0 p-0"}
        value={open ? search : inputValue}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setSearch(''); }}
        onChange={e => { setSearch(e.target.value); if (!open) setOpen(true); }}
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">No products found</div>
          ) : (
            filtered.map(p => (
              <button key={p.id} type="button"
                onClick={() => handleSelect(p)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex items-center justify-between">
                <span>
                  <span className="font-medium text-gray-900">{p.name}</span>
                  {p.code && <span className="ml-2 text-xs text-gray-400 font-mono">({p.code})</span>}
                </span>
                <span className="text-xs text-gray-400">{p.unitName} · {p.vatRate ?? 19}%</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
