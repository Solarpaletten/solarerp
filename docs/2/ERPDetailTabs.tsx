// components/erp/ERPDetailTabs.tsx
// ═══════════════════════════════════════════════════
// Task 44: ERP Detail Tabs
// ═══════════════════════════════════════════════════
// Tab system for entity detail/edit views
// Matches Site.pro pattern:
//   General | Addresses | Bank accounts | Invoices | CRM

'use client';

import { useState } from 'react';

export type TabDef = {
  key: string;
  label: string;
  icon?: string;
  content: React.ReactNode;
  badge?: number;
};

type Props = {
  tabs: TabDef[];
  defaultTab?: string;
};

export function ERPDetailTabs({ tabs, defaultTab }: Props) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.key || '');

  const activeContent = tabs.find(t => t.key === activeTab)?.content;

  return (
    <div className="flex flex-col h-full">
      {/* Tab header */}
      <div className="bg-white border-b border-gray-200 px-4">
        <nav className="flex gap-0 -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon && <span className="text-xs">{tab.icon}</span>}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-600">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-5">
        {activeContent}
      </div>
    </div>
  );
}
