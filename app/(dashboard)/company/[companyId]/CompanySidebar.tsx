// app/(dashboard)/company/[companyId]/CompanySidebar.tsx
// Cookie-only — company name fetched from API, not localStorage
// Logout via POST /api/auth/logout

'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GripVertical, ChevronDown, ChevronRight } from 'lucide-react';

interface CompanySidebarProps {
  companyId: string;
}

type MenuItem = {
  id: string;
  type: 'item';
  title: string;
  route: string;
  icon: string;
  badge?: string;
};

type MenuGroup = {
  id: string;
  type: 'group';
  title: string;
  items: MenuItem[];
};

type Section = MenuItem | MenuGroup;

export default function CompanySidebar({ companyId }: CompanySidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState('');

  const [sections, setSections] = useState<Section[]>([
    { id: 'dashboard', type: 'item', title: 'Dashboard', route: `/company/${companyId}/dashboard`, icon: '📊' },
    { id: 'clients', type: 'item', title: 'Clients', route: `/company/${companyId}/clients`, icon: '👥' },
    {
      id: 'warehouseGroup',
      type: 'group',
      title: 'Склад',
      items: [
        { id: 'products', type: 'item', title: 'Products', route: `/company/${companyId}/products`, icon: '📦' },
        { id: 'warehouse', type: 'item', title: 'Warehouse', route: `/company/${companyId}/warehouse`, icon: '🏭' },
      ],
    },
    {
      id: 'salesGroup',
      type: 'group',
      title: 'Продажи и покупки',
      items: [
        { id: 'sales', type: 'item', title: 'Sales', route: `/company/${companyId}/sales`, icon: '💰' },
        { id: 'purchases', type: 'item', title: 'Purchases', route: `/company/${companyId}/purchases`, icon: '🛒' },
      ],
    },
    {
      id: 'financeGroup',
      type: 'group',
      title: 'Финансы',
      items: [
        { id: 'accounts', type: 'item', title: 'Chart of Accounts', route: `/company/${companyId}/chart-of-accounts`, icon: '📋' },
        { id: 'banking', type: 'item', title: 'Banking', route: `/company/${companyId}/banking`, icon: '🏦' },
      ],
    },
    { id: 'settings', type: 'item', title: 'Settings', route: `/company/${companyId}/settings`, icon: '⚙️' },
  ]);

  const [draggedSection, setDraggedSection] = useState<Section | null>(null);
  const [dragOverSection, setDragOverSection] = useState<Section | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    warehouseGroup: true,
    salesGroup: true,
    financeGroup: true,
  });

  // Fetch company name from API instead of localStorage
  useEffect(() => {
    const fetchCompanyName = async () => {
      try {
        const res = await fetch(`/api/account/companies/${companyId}`);
        if (res.ok) {
          const data = await res.json();
          setCompanyName(data.name || 'Company');
        }
      } catch {
        setCompanyName('Company');
      }
    };
    fetchCompanyName();
  }, [companyId]);

  const handleDragStart = (e: React.DragEvent, section: Section) => {
    setDraggedSection(section);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, section: Section) => {
    e.preventDefault();
    setDragOverSection(section);
  };

  const handleDragLeave = () => {
    setDragOverSection(null);
  };

  const handleDrop = (e: React.DragEvent, targetSection: Section) => {
    e.preventDefault();
    if (!draggedSection || draggedSection.id === targetSection.id) {
      setDraggedSection(null);
      setDragOverSection(null);
      return;
    }
    const newSections = [...sections];
    const fromIndex = newSections.findIndex((s) => s.id === draggedSection.id);
    const toIndex = newSections.findIndex((s) => s.id === targetSection.id);
    newSections.splice(fromIndex, 1);
    newSections.splice(toIndex, 0, draggedSection);
    setSections(newSections);
    setDraggedSection(null);
    setDragOverSection(null);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const isActive = (route: string) => pathname === route;

  // Cookie-only logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* continue */ }
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 text-white">
      <div className="flex items-center justify-center h-16 border-b border-slate-700 px-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-2xl">
            ☀️
          </div>
          <div>
            <h2 className="text-sm font-semibold truncate max-w-[150px]">
              {companyName || 'Company'}
            </h2>
            <p className="text-xs text-slate-400">Solar ERP</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {sections.map((section) => (
          <div
            key={section.id}
            className={`${dragOverSection?.id === section.id ? 'border-t-2 border-orange-500' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, section)}
            onDragOver={(e) => handleDragOver(e, section)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, section)}
          >
            {section.type === 'item' ? (
              <Link
                href={section.route}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all my-0.5 ${
                  isActive(section.route)
                    ? 'bg-slate-700 border-r-2 border-orange-500'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <GripVertical className="w-3 h-3 mr-1 text-slate-500 cursor-grab" />
                <span className="mr-2 text-sm">{section.icon}</span>
                <span className="text-sm">{section.title}</span>
              </Link>
            ) : (
              <div className="my-0.5">
                <button
                  onClick={() => toggleGroup(section.id)}
                  className="flex items-center w-full px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
                >
                  <GripVertical className="w-3 h-3 mr-1 text-slate-500 cursor-grab" />
                  {expandedGroups[section.id] ? (
                    <ChevronDown className="w-3 h-3 mr-1" />
                  ) : (
                    <ChevronRight className="w-3 h-3 mr-1" />
                  )}
                  {section.title}
                </button>
                {expandedGroups[section.id] && (
                  <div className="ml-4">
                    {section.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.route}
                        className={`flex items-center px-3 py-2 text-sm rounded-lg transition-all my-0.5 ${
                          isActive(item.route)
                            ? 'bg-slate-700 border-r-2 border-orange-500'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        <span className="mr-2 text-sm">{item.icon}</span>
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-700 p-4 space-y-2">
        <button
          onClick={() => router.push('/account/companies')}
          className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
        >
          <span className="mr-3">🔙</span>
          <span>Back to Companies</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-slate-700 rounded-lg transition-all"
        >
          <span className="mr-3">🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
