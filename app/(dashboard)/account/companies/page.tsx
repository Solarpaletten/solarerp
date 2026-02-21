// app/(dashboard)/account/companies/page.tsx
// ═══════════════════════════════════════════════════
// Cookie-only — no localStorage for auth or priorities
// Priorities come from DB (orderBy priority asc)
// Cookie sent automatically by browser
// ═══════════════════════════════════════════════════
//
// FIXED (Task 18):
// - id: number → id: string (matches Prisma cuid)
// - is_active → status (matches Prisma schema)
// - created_at → createdAt (matches Prisma schema)
// - handleEnterCompany(companyId: string)
// - savePriorities key: string

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus, GripVertical } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  code: string;
  description?: string;
  status?: string;
  createdAt?: string;
  clientsCount?: number;
  salesCount?: number;
  productsCount?: number;
  priority?: number;
  avatar?: string;
  color?: string;
}

interface CreateCompanyData {
  name: string;
  code: string;
  description: string;
  industry: string;
  country: string;
}

export default function CompaniesPage() {
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', code: '', description: '' });
  const [showDeleteModal, setShowDeleteModal] = useState<Company | null>(null);
  const [createFormData, setCreateFormData] = useState<CreateCompanyData>({
    name: '', code: '', description: '', industry: 'RENEWABLE_ENERGY', country: 'DE',
  });

  const [draggedItem, setDraggedItem] = useState<Company | null>(null);
  const [dragOverItem, setDragOverItem] = useState<Company | null>(null);

  const getCompanyColor = (name: string) => {
    const colors = [
      'bg-orange-500', 'bg-red-500', 'bg-purple-500',
      'bg-orange-600', 'bg-blue-600', 'bg-green-600',
      'bg-indigo-500', 'bg-pink-500', 'bg-yellow-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // ═══════════════════════════════════════════════
  // PRIORITIES: Save to DB only (no localStorage)
  // Key type: string (cuid), not number
  // ═══════════════════════════════════════════════
  const savePriorities = async (updatedCompanies: Company[]) => {
    try {
      const priorities: { [key: string]: number } = {};
      updatedCompanies.forEach(company => {
        priorities[company.id] = company.priority || 1;
      });

      await fetch('/api/account/companies/priorities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorities }),
      });
    } catch (error) {
      console.error('Error saving priorities:', error);
    }
  };

  // ═══════════════════════════════════════════════
  // FETCH: Cookie-only, priorities from DB order
  // ═══════════════════════════════════════════════
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cookie sent automatically — no x-user-id header needed
      const response = await fetch('/api/account/companies');

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.companies) {
          // Companies already sorted by priority from DB
          const enhancedCompanies = data.companies.map((company: Company, index: number) => ({
            ...company,
            priority: company.priority ? company.priority : (index + 1),
            avatar: company.name.charAt(0).toUpperCase(),
            color: getCompanyColor(company.name)
          }));

          setCompanies(enhancedCompanies);
          setIsConnected(true);
        } else {
          throw new Error('Invalid API response format');
        }
      } else if (response.status === 401) {
        // Session expired — middleware should catch this, but handle edge case
        router.replace('/login');
        return;
      } else {
        throw new Error(`API returned ${response.status}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load companies';
      console.error('Error loading companies:', error);
      setError(message);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Enter company — companyId is string (cuid)
  const handleEnterCompany = (companyId: string) => {
    router.push(`/company/${companyId}/dashboard`);
  };

  // Drag & drop
  const handleDragStart = (e: React.DragEvent, company: Company) => {
    setDraggedItem(company);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, company: Company) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItem(company);
  };

  const handleDragLeave = () => { setDragOverItem(null); };

  const handleDrop = async (e: React.DragEvent, targetCompany: Company) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetCompany.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const newCompanies = [...companies];
    const draggedIndex = newCompanies.findIndex(c => c.id === draggedItem.id);
    const targetIndex = newCompanies.findIndex(c => c.id === targetCompany.id);

    const [draggedCompany] = newCompanies.splice(draggedIndex, 1);
    newCompanies.splice(targetIndex, 0, draggedCompany);

    const updatedCompanies = newCompanies.map((company, index) => ({
      ...company,
      priority: index + 1
    }));

    setCompanies(updatedCompanies);
    setDraggedItem(null);
    setDragOverItem(null);

    await savePriorities(updatedCompanies);
  };

  const handleDragEnd = () => { setDraggedItem(null); setDragOverItem(null); };

  // Create company
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/account/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createFormData),
      });

      if (response.ok) {
        await fetchCompanies();
        setShowCreateForm(false);
        setCreateFormData({ name: '', code: '', description: '', industry: 'RENEWABLE_ENERGY', country: 'DE' });
      } else {
        throw new Error('Failed to create company');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create company';
      setError(message);
    }
  };

  // Update
  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    const response = await fetch(`/api/account/companies/${editingCompany.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editFormData),
    });

    if (response.ok) {
      setEditingCompany(null);
      await fetchCompanies();
    } else {
      alert('Failed to update company');
    }
  };

  // Copy
  const handleCopyCompany = async (company: Company) => {
    const response = await fetch('/api/account/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: company.name + ' Copy',
        code: `${company.code}_COPY_${Math.floor(Math.random() * 1000)}`,
      }),
    });
    if (response.ok) await fetchCompanies();
    else alert('Failed to copy company');
  };

  // Delete
  const handleDeleteCompany = async (company: Company) => {
    const response = await fetch(`/api/account/companies/${company.id}`, { method: 'DELETE' });
    if (response.ok) {
      setShowDeleteModal(null);
      await fetchCompanies();
    } else {
      alert('Failed to delete company');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading companies...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="text-6xl mr-4">☀️</div>
            <h1 className="text-4xl font-bold text-gray-800">Solar ERP</h1>
          </div>
          <p className="text-xl text-gray-600 mb-4">Account Dashboard</p>
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Connected to API' : 'Connection Error'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Companies ({companies.length})</h2>
          <button onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all">
            <Plus className="w-5 h-5" /> New Company
          </button>
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div key={company.id}
              draggable
              onDragStart={(e) => handleDragStart(e, company)}
              onDragOver={(e) => handleDragOver(e, company)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, company)}
              onDragEnd={handleDragEnd}
              className={`bg-white rounded-xl shadow-md p-6 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-lg ${
                dragOverItem?.id === company.id ? 'border-2 border-blue-400 scale-[1.02]' : 'border border-gray-100'
              } ${draggedItem?.id === company.id ? 'opacity-50' : ''}`}
            >
              {/* Company Avatar & Name */}
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 ${company.color || 'bg-blue-500'} rounded-lg flex items-center justify-center text-white text-xl font-bold mr-3`}>
                  {company.avatar || '?'}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800">{company.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{company.code}</span>
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">ID: {company.id}</span>
                  </div>
                </div>
                <GripVertical className="w-5 h-5 text-gray-300" />
              </div>

              {/* Actions */}
              <div className="flex gap-2 mb-4 text-xs">
                <button onClick={() => { setEditingCompany(company); setEditFormData({ name: company.name, code: company.code, description: company.description || '' }); }}
                  className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">✏️ Edit</button>
                <button onClick={() => handleCopyCompany(company)}
                  className="px-3 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200">📄 Copy</button>
                <button onClick={() => setShowDeleteModal(company)}
                  className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200">🗑️ Delete</button>
              </div>

              {/* Enter Company */}
              <button onClick={() => handleEnterCompany(company.id)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2">
                <span>Enter Company</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold mb-4">Create New Company</h3>
              <form onSubmit={handleCreateCompany}>
                <div className="space-y-3">
                  <input placeholder="Company Name" required
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  <input placeholder="Company Code" required
                    value={createFormData.code}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  <textarea placeholder="Description"
                    value={createFormData.description}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" rows={3} />
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold">Create</button>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingCompany && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold mb-4">Edit: {editingCompany.name}</h3>
              <form onSubmit={handleEditCompany}>
                <div className="space-y-3">
                  <input placeholder="Company Name" required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  <input placeholder="Company Code" required
                    value={editFormData.code}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  <textarea placeholder="Description"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" rows={3} />
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold">Save</button>
                  <button type="button" onClick={() => setEditingCompany(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold mb-2">Delete Company?</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to delete <strong>{showDeleteModal.name}</strong>?</p>
              <div className="flex gap-3">
                <button onClick={() => handleDeleteCompany(showDeleteModal)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold">Delete</button>
                <button onClick={() => setShowDeleteModal(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-semibold">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
