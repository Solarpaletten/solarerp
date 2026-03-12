// components/purchases/PurchaseHeaderEdit.tsx
// ═══════════════════════════════════════════════════
// Task 57_4 Phase 3 — Purchase Header with ALL SelectDialogs
// ═══════════════════════════════════════════════════
// AUDIT FIX (D=>C score 86→100):
//   - VAT Rate: now stores vatRateId + vatRateCode + vatRatePercent + vatRateName
//   - Warehouse: now stores warehouseId + warehouseName (was name only)
//   - Employee: now stores employeeId + employeeName (was name only)
//   - Supplier: already correct (supplierId + supplierName + supplierCode)
//
// 5 SelectDialogs:
//   1. Supplier     → ClientSelectDialog (all clients, no role filter)
//   2. Warehouse    → WarehouseSelectDialog
//   3. OperationType → OperationTypeSelectDialog (module=PURCHASE)
//   4. VAT Rate     → VATRateSelectDialog
//   5. Employee     → EmployeeSelectDialog
//
// ARCHITECTURE (L=>C):
//   No filterRole. Role = document context, not entity. SAP standard.
//   Every entity stores: entityId + display snapshot (name/code).

'use client';

import { useState } from 'react';
import {
  ClientSelectDialog,
  type ClientEntity,
} from '@/components/select/ClientSelectDialog';
import {
  WarehouseSelectDialog,
  type WarehouseEntity,
} from '@/components/select/WarehouseSelectDialog';
import {
  OperationTypeSelectDialog,
  type OperationTypeEntity,
} from '@/components/select/OperationTypeSelectDialog';
import {
  VATRateSelectDialog,
  type VATRateEntity,
} from '@/components/select/VATRateSelectDialog';
import {
  EmployeeSelectDialog,
  type EmployeeEntity,
} from '@/components/select/EmployeeSelectDialog';

const INPUT_CLASS =
  'w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent';

// ─── Props ──────────────────────────────────────────
// Header form must store ID + display for all entities
interface HeaderEditProps {
  companyId: string;
  form: {
    purchaseDate: string;
    // Supplier (ID + snapshot)
    supplierId?: string;
    supplierName: string;
    supplierCode: string;
    // Warehouse (ID + snapshot)
    warehouseId?: string;
    warehouseName: string;
    // Operation Type
    operationType: string;
    // VAT Rate (ID + code + percent + name)
    vatRateId?: string;
    vatRateCode?: string;
    vatRatePercent?: number;
    vatRateName?: string;
    // Employee (ID + snapshot)
    employeeId?: string;
    employeeName?: string;
    // Other
    currencyCode: string;
    comments: string;
  };
  onChange: (key: string, value: string | number | boolean) => void;
  series: string;
  number: string;
}

// ─── Field Wrapper ──────────────────────────────────
function Field({ label, children, required }: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Selector Button (ERP-style clickable field) ────
function SelectorButton({ value, placeholder, onClick, onClear }: {
  value: string;
  placeholder: string;
  onClick: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        className={`flex-1 text-left text-sm border border-gray-200 rounded-md px-3 py-1.5
          hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer
          focus:outline-none focus:ring-1 focus:ring-blue-400
          ${value ? 'text-gray-900' : 'text-gray-400'}`}
      >
        {value || placeholder}
      </button>
      {value && onClear && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="text-gray-300 hover:text-red-500 transition-colors p-1"
          title="Clear"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function PurchaseHeaderEdit({
  companyId,
  form,
  onChange,
  series,
  number,
}: HeaderEditProps) {
  // ─── Dialog open states ──────────────────────────
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [opTypeOpen, setOpTypeOpen] = useState(false);
  const [vatRateOpen, setVatRateOpen] = useState(false);
  const [employeeOpen, setEmployeeOpen] = useState(false);

  // ─── Handlers: ID + display snapshot ─────────────

  // 1. Supplier — all clients, no role filter
  const handleSupplierSelect = (client: ClientEntity) => {
    onChange('supplierId', client.id);
    onChange('supplierName', client.name);
    onChange('supplierCode', client.code || '');
  };
  const handleSupplierClear = () => {
    onChange('supplierId', '');
    onChange('supplierName', '');
    onChange('supplierCode', '');
  };

  // 2. Warehouse — ID + name
  const handleWarehouseSelect = (wh: WarehouseEntity) => {
    onChange('warehouseId', wh.id);
    onChange('warehouseName', wh.name);
  };
  const handleWarehouseClear = () => {
    onChange('warehouseId', '');
    onChange('warehouseName', '');
  };

  // 3. Operation Type — code (stored in operationType field)
  const handleOpTypeSelect = (op: OperationTypeEntity) => {
    onChange('operationType', op.code);
  };
  const handleOpTypeClear = () => {
    onChange('operationType', '');
  };

  // 4. VAT Rate — ID + code + percent + name
  const handleVatRateSelect = (vr: VATRateEntity) => {
    onChange('vatRateId', vr.id);
    onChange('vatRateCode', vr.code || '');
    onChange('vatRatePercent', Number(vr.rate));
    onChange('vatRateName', vr.name);
  };
  const handleVatRateClear = () => {
    onChange('vatRateId', '');
    onChange('vatRateCode', '');
    onChange('vatRatePercent', 0);
    onChange('vatRateName', '');
  };

  // 5. Employee — ID + name
  const handleEmployeeSelect = (emp: EmployeeEntity) => {
    onChange('employeeId', emp.id);
    onChange('employeeName', emp.name);
  };
  const handleEmployeeClear = () => {
    onChange('employeeId', '');
    onChange('employeeName', '');
  };

  // ─── Display values ──────────────────────────────
  const supplierDisplay = form.supplierName
    ? `${form.supplierCode ? form.supplierCode + ' — ' : ''}${form.supplierName}`
    : '';

  const warehouseDisplay = form.warehouseName || '';

  const operationTypeDisplay = form.operationType || '';

  const vatRateDisplay = form.vatRateName
    ? `${form.vatRateName} (${form.vatRatePercent ?? 0}%)`
    : '';

  const employeeDisplay = form.employeeName || '';

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* ─── Document Title Bar ─────────────────────── */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {series}-{number}
            </h2>
            <span className="text-xs text-gray-400">Purchase Document</span>
          </div>
          <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border bg-gray-50 text-gray-600 border-gray-200">
            DRAFT
          </span>
        </div>

        {/* ─── 3-Column Editable Grid ─────────────────── */}
        <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">

          {/* ── Column 1: Date, Currency, VAT Rate ──────── */}
          <div className="space-y-3">
            <Field label="Purchase Date" required>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => onChange('purchaseDate', e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <Field label="Currency">
              <select
                value={form.currencyCode}
                onChange={(e) => onChange('currencyCode', e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="CHF">CHF</option>
              </select>
            </Field>

            <Field label="VAT Rate">
              <SelectorButton
                value={vatRateDisplay}
                placeholder="Select VAT rate..."
                onClick={() => setVatRateOpen(true)}
                onClear={form.vatRateId ? handleVatRateClear : undefined}
              />
            </Field>
          </div>

          {/* ── Column 2: Supplier & Employee ────────────── */}
          <div className="space-y-3">
            <Field label="Supplier" required>
              <SelectorButton
                value={supplierDisplay}
                placeholder="Click to select supplier..."
                onClick={() => setSupplierOpen(true)}
                onClear={form.supplierId ? handleSupplierClear : undefined}
              />
            </Field>

            <Field label="Responsible Employee">
              <SelectorButton
                value={employeeDisplay}
                placeholder="Select employee..."
                onClick={() => setEmployeeOpen(true)}
                onClear={form.employeeId ? handleEmployeeClear : undefined}
              />
            </Field>

            <Field label="Comments">
              <textarea
                value={form.comments}
                onChange={(e) => onChange('comments', e.target.value)}
                rows={2}
                className={`${INPUT_CLASS} resize-none`}
                placeholder="Notes..."
              />
            </Field>
          </div>

          {/* ── Column 3: Warehouse & Operation Type ────── */}
          <div className="space-y-3">
            <Field label="Warehouse" required>
              <SelectorButton
                value={warehouseDisplay}
                placeholder="Click to select warehouse..."
                onClick={() => setWarehouseOpen(true)}
                onClear={form.warehouseId ? handleWarehouseClear : undefined}
              />
            </Field>

            <Field label="Operation Type" required>
              <SelectorButton
                value={operationTypeDisplay}
                placeholder="Click to select operation..."
                onClick={() => setOpTypeOpen(true)}
                onClear={form.operationType ? handleOpTypeClear : undefined}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* ═══ SelectDialog Modals (ALL 5) ══════════════ */}

      {/* 1. Supplier — ALL clients, no role filter */}
      <ClientSelectDialog
        companyId={companyId}
        open={supplierOpen}
        onClose={() => setSupplierOpen(false)}
        onSelect={handleSupplierSelect}
      />

      {/* 2. Warehouse — stores ID + name */}
      <WarehouseSelectDialog
        companyId={companyId}
        open={warehouseOpen}
        onClose={() => setWarehouseOpen(false)}
        onSelect={handleWarehouseSelect}
      />

      {/* 3. Operation Type (PURCHASE module only) */}
      <OperationTypeSelectDialog
        companyId={companyId}
        open={opTypeOpen}
        onClose={() => setOpTypeOpen(false)}
        onSelect={handleOpTypeSelect}
        module="PURCHASE"
      />

      {/* 4. VAT Rate — stores ID + code + percent + name */}
      <VATRateSelectDialog
        companyId={companyId}
        open={vatRateOpen}
        onClose={() => setVatRateOpen(false)}
        onSelect={handleVatRateSelect}
      />

      {/* 5. Employee — stores ID + name */}
      <EmployeeSelectDialog
        companyId={companyId}
        open={employeeOpen}
        onClose={() => setEmployeeOpen(false)}
        onSelect={handleEmployeeSelect}
      />
    </>
  );
}
