// components/ui/FormField.tsx
// ═══════════════════════════════════════════════════
// Shared ERP form primitives — used across all editors
// ═══════════════════════════════════════════════════

'use client';

export const INPUT = "w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white";
export const SELECT = `${INPUT} appearance-none`;

export function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Section({ title, color, children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
      <h3 className={`text-sm font-semibold ${color || 'text-gray-700'} border-b border-gray-100 pb-2`}>{title}</h3>
      {children}
    </div>
  );
}
