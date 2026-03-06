// components/clients/ClientSelector.tsx
// ═══════════════════════════════════════════════════
// Task 54 FINAL: Client Selector with all Dashka fixes
// ═══════════════════════════════════════════════════
// - Fixed initial load bug (Dashka critical fix #1)
// - Server-side search with debounce
// - Role filtering with correct logic
// - Inline client creation

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface ClientOption {
  id: string;
  name: string;
  code: string | null;
  vatCode: string | null;
  payWithinDays: number | null;
  type: string;
  role: string;
  isActive: boolean;
}

type Props = {
  companyId: string;
  value?: string; // clientId
  onSelect: (client: ClientOption) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  role?: 'CUSTOMER' | 'SUPPLIER' | 'BOTH'; // Filter by role
  onCreateNew?: () => void; // Callback for inline creation
};

export function ClientSelector({
  companyId,
  value,
  onSelect,
  placeholder = 'Select client...',
  className,
  disabled = false,
  role = 'BOTH',
  onCreateNew,
}: Props) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch clients with debounce
  const fetchClients = useCallback(async (query: string): Promise<ClientOption[]> => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: query,
        pageSize: '20',
        role,
      });

      const res = await fetch(
        `/api/company/${companyId}/clients?${params.toString()}`,
        { cache: 'no-store' }
      );

      if (!res.ok) {
        setClients([]);
        setLoading(false);
        return [];
      }

      const json = await res.json();
      const fetched: ClientOption[] = (json.data || []).map((c: Record<string, unknown>) => ({
        id: String(c.id),
        name: String(c.name || ''),
        code: c.code ? String(c.code) : null,
        vatCode: c.vatCode ? String(c.vatCode) : null,
        payWithinDays: c.payWithinDays != null ? Number(c.payWithinDays) : null,
        type: String(c.type || ''),
        role: String(c.role || 'BOTH'),
        isActive: Boolean(c.isActive),
      }));

      setClients(fetched);
      setLoading(false);
      return fetched; // Return for initial load
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      setClients([]);
      setLoading(false);
      return [];
    }
  }, [companyId, role]);

  // DASHKA FIX #1: Load initial client directly from API instead of relying on state
  useEffect(() => {
    if (value && !selectedClient) {
      const loadClient = async () => {
        try {
          const res = await fetch(`/api/company/${companyId}/clients/${value}`, {
            cache: 'no-store',
          });
          if (res.ok) {
            const json = await res.json();
            const c = json.data;
            const client: ClientOption = {
              id: c.id,
              name: c.name,
              code: c.code,
              vatCode: c.vatCode,
              payWithinDays: c.payWithinDays,
              type: c.type,
              role: c.role,
              isActive: c.isActive,
            };
            setSelectedClient(client);
            setInputValue(client.code ? `${client.name} (${client.code})` : client.name);
          }
        } catch (error) {
          console.error('Failed to load selected client:', error);
        }
      };
      loadClient();
    }
  }, [value, companyId, selectedClient]);

  // Handle search with debounce
  const handleSearch = (query: string) => {
    setSearch(query);
    setOpen(true);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce fetch: 300ms
    debounceRef.current = setTimeout(() => {
      fetchClients(query);
    }, 300);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSelect = (client: ClientOption) => {
    setSelectedClient(client);
    setInputValue(client.code ? `${client.name} (${client.code})` : client.name);
    setSearch('');
    setOpen(false);
    onSelect(client);
  };

  const displayValue = open ? search : inputValue;

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => {
          setOpen(true);
          if (!search && clients.length === 0) {
            fetchClients('');
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={
          className ||
          'w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 ' +
          'focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent ' +
          'disabled:bg-gray-50 disabled:text-gray-400'
        }
      />

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50">
          {loading ? (
            <div className="px-3 py-2 text-xs text-gray-400">Searching...</div>
          ) : clients.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">
              {search && search.length < 2 ? 'Type at least 2 characters' : 'No matches found'}
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {clients.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(client)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors border-b last:border-b-0"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {client.name}
                          {client.code && (
                            <span className="text-gray-500 ml-1">({client.code})</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {client.vatCode && <div>VAT: {client.vatCode}</div>}
                          {client.payWithinDays && (
                            <div>Payment: {client.payWithinDays} days</div>
                          )}
                        </div>
                      </div>
                      <div className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        {client.role}
                      </div>
                    </div>
                  </button>
                </li>
              ))}

              {/* Inline Create Button */}
              {onCreateNew && (
                <li className="border-t bg-gray-50">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onCreateNew();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-blue-100 transition-colors font-medium"
                  >
                    + Create new client
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
