// app/api/company/[companyId]/initialize-defaults/route.ts
// ═══════════════════════════════════════════════════
// Task 57.5 — Company Reference Data Initialization
// ═══════════════════════════════════════════════════
// POST: Creates standard reference data for a company
// Idempotent: skips records that already exist
//
// Creates:
//   - 2 Warehouses (Goods, Office)
//   - 3 Clients (Buyer, Supplier, demo)
//   - 6 Products (goods with/without VAT, services with/without VAT)
//   - 3 Employees (Director, Manager, Warehouse)
//   - 6 VAT Rates (19%, 7%, 0% export, 0% intra, reverse charge, no VAT)
//   - 5 Operation Types (purchase goods/services/advance, sale goods/services)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';

type RouteParams = { params: Promise<{ companyId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true, name: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const stats = { warehouses: 0, clients: 0, products: 0, employees: 0, vatRates: 0, operationTypes: 0 };

      // ═══════════════════════════════════════════
      // EMPLOYEES
      // ═══════════════════════════════════════════
      const employeeDefaults = [
        { code: 'DIR-01', name: 'Director', position: 'Director', department: 'Management' },
        { code: 'MGR-01', name: 'Purchase Manager', position: 'Manager', department: 'Procurement' },
        { code: 'WH-01', name: 'Warehouse Keeper', position: 'Warehouse', department: 'Logistics' },
      ];

      const employees: Record<string, string> = {};
      for (const emp of employeeDefaults) {
        const existing = await tx.employee.findFirst({ where: { companyId, code: emp.code } });
        if (!existing) {
          const created = await tx.employee.create({ data: { companyId, ...emp, isActive: true } });
          employees[emp.code] = created.id;
          stats.employees++;
        } else {
          employees[emp.code] = existing.id;
        }
      }

      // ═══════════════════════════════════════════
      // WAREHOUSES
      // ═══════════════════════════════════════════
      const warehouseDefaults = [
        { name: 'Goods', code: 'WH-GOODS', isDefault: true, address: 'Main warehouse' },
        { name: 'Office', code: 'WH-OFFICE', isDefault: false, address: 'Office supplies' },
      ];

      for (const wh of warehouseDefaults) {
        const existing = await tx.warehouse.findFirst({ where: { companyId, name: wh.name } });
        if (!existing) {
          await tx.warehouse.create({
            data: {
              companyId,
              name: wh.name,
              code: wh.code,
              isDefault: wh.isDefault,
              isActive: true,
              address: wh.address,
              responsibleEmployeeId: employees['WH-01'] || null,
            },
          });
          stats.warehouses++;
        }
      }

      // ═══════════════════════════════════════════
      // CLIENTS (Buyer + Supplier + demo)
      // ═══════════════════════════════════════════
      const clientDefaults = [
        {
          code: 'BUYER-001', name: 'Demo Buyer GmbH', shortName: 'Buyer',
          role: 'CUSTOMER', type: 'COMPANY', location: 'EU',
          vatCode: 'DE100000001', email: 'buyer@demo.de', paymentTermsDays: 14,
        },
        {
          code: 'SUP-001', name: 'Demo Supplier Ltd', shortName: 'Supplier',
          role: 'SUPPLIER', type: 'COMPANY', location: 'EU',
          vatCode: 'DE200000002', email: 'supplier@demo.de', paymentTermsDays: 30,
        },
        {
          code: 'TRADE-001', name: 'Trade Partner AG', shortName: 'Trade',
          role: 'BOTH', type: 'COMPANY', location: 'LOCAL',
          vatCode: 'DE300000003', email: 'trade@demo.de', paymentTermsDays: 21,
        },
      ];

      for (const cl of clientDefaults) {
        const existing = await tx.client.findFirst({ where: { companyId, code: cl.code } });
        if (!existing) {
          await tx.client.create({
            data: {
              companyId,
              tenantId,
              code: cl.code,
              name: cl.name,
              shortName: cl.shortName,
              role: cl.role,
              type: cl.type,
              location: cl.location,
              vatCode: cl.vatCode,
              email: cl.email,
              paymentTermsDays: cl.paymentTermsDays,
              isActive: true,
            },
          });
          stats.clients++;
        }
      }

      // ═══════════════════════════════════════════
      // VAT RATES
      // ═══════════════════════════════════════════
      const vatDefaults = [
        { code: 'VAT-19', name: '19% Standard', rate: 19, category: 'STANDARD', isDefault: true },
        { code: 'VAT-7', name: '7% Reduced (food)', rate: 7, category: 'REDUCED', isDefault: false },
        { code: 'VAT-0-EXP', name: '0% Export', rate: 0, category: 'ZERO_EXPORT', isDefault: false },
        { code: 'VAT-0-EU', name: '0% Intra-community', rate: 0, category: 'ZERO_INTRACOM', isDefault: false },
        { code: 'VAT-RC', name: 'Reverse Charge', rate: 0, category: 'REVERSE_CHARGE', isDefault: false },
        { code: 'VAT-0', name: 'No VAT', rate: 0, category: 'NO_VAT', isDefault: false },
      ];

      for (const vr of vatDefaults) {
        const existing = await tx.vatRate.findFirst({ where: { companyId, code: vr.code } });
        if (!existing) {
          await tx.vatRate.create({
            data: {
              companyId,
              code: vr.code,
              name: vr.name,
              rate: vr.rate,
              category: vr.category,
              isDefault: vr.isDefault,
              isActive: true,
            },
          });
          stats.vatRates++;
        }
      }

      // ═══════════════════════════════════════════
      // OPERATION TYPES (SKR03)
      // ═══════════════════════════════════════════
      const opTypeDefaults = [
        {
          code: 'PIRK', name: 'Purchase goods', module: 'PURCHASE',
          debitAccountCode: '3400', creditAccountCode: '1600', vatAccountCode: '1576',
          expenseAccountCode: '5000',
          affectsWarehouse: true, affectsVat: true, priority: 10,
        },
        {
          code: 'PPS', name: 'Purchase services', module: 'PURCHASE',
          debitAccountCode: '4900', creditAccountCode: '1600', vatAccountCode: '1576',
          affectsWarehouse: false, affectsVat: true, priority: 5,
        },
        {
          code: 'AV', name: 'Advance invoice', module: 'PURCHASE',
          debitAccountCode: '1518', creditAccountCode: '1600',
          affectsWarehouse: false, affectsVat: false, priority: 1,
        },
        {
          code: 'SALE', name: 'Sale goods', module: 'SALE',
          debitAccountCode: '1200', creditAccountCode: '8400', vatAccountCode: '1776',
          expenseAccountCode: '5800',
          affectsWarehouse: true, affectsVat: true, priority: 10,
        },
        {
          code: 'SSVC', name: 'Sale services', module: 'SALE',
          debitAccountCode: '1200', creditAccountCode: '8400', vatAccountCode: '1776',
          affectsWarehouse: false, affectsVat: true, priority: 5,
        },
      ];

      for (const ot of opTypeDefaults) {
        const existing = await tx.operationType.findFirst({ where: { companyId, code: ot.code } });
        if (!existing) {
          await tx.operationType.create({
            data: {
              companyId,
              code: ot.code,
              name: ot.name,
              module: ot.module,
              debitAccountCode: ot.debitAccountCode,
              creditAccountCode: ot.creditAccountCode,
              vatAccountCode: ot.vatAccountCode || null,
              expenseAccountCode: ot.expenseAccountCode || null,
              affectsWarehouse: ot.affectsWarehouse,
              affectsVat: ot.affectsVat,
              isActive: true,
              priority: ot.priority,
            },
          });
          stats.operationTypes++;
        }
      }

      // ═══════════════════════════════════════════
      // PRODUCTS (goods + services, with/without VAT)
      // ═══════════════════════════════════════════
      const productDefaults = [
        // Goods WITH VAT
        { code: 'PRD-001', name: 'Standard Product', unitName: 'pcs', vatRate: 19, priceWithoutVat: 100, priceWithVat: 119, attributeName: 'Goods', freePrice: false },
        // Goods WITHOUT VAT (export)
        { code: 'PRD-002', name: 'Export Product', unitName: 'pcs', vatRate: 0, priceWithoutVat: 250, priceWithVat: 250, attributeName: 'Goods', freePrice: false },
        // Goods with reduced VAT (food)
        { code: 'PRD-003', name: 'Food Product', unitName: 'kg', vatRate: 7, priceWithoutVat: 10, priceWithVat: 10.70, attributeName: 'Goods', freePrice: false },
        // Service WITH VAT
        { code: 'SRV-001', name: 'Consulting Service', unitName: 'hours', vatRate: 19, priceWithoutVat: 150, priceWithVat: 178.50, attributeName: 'Service', freePrice: false },
        // Service WITHOUT VAT
        { code: 'SRV-002', name: 'Export Service', unitName: 'hours', vatRate: 0, priceWithoutVat: 200, priceWithVat: 200, attributeName: 'Service', freePrice: false },
        // Free price product
        { code: 'PRD-FREE', name: 'Custom Product', unitName: 'pcs', vatRate: 19, priceWithoutVat: 0, priceWithVat: 0, attributeName: 'Goods', freePrice: true },
      ];

      for (const prod of productDefaults) {
        const existing = await tx.item.findFirst({ where: { companyId, code: prod.code } });
        if (!existing) {
          await tx.item.create({
            data: {
              companyId,
              code: prod.code,
              name: prod.name,
              unitName: prod.unitName,
              vatRate: prod.vatRate,
              priceWithoutVat: prod.priceWithoutVat,
              priceWithVat: prod.priceWithVat,
              attributeName: prod.attributeName,
              freePrice: prod.freePrice,
            },
          });
          stats.products++;
        }
      }

      return stats;
    });

    return NextResponse.json({
      message: 'Company defaults initialized successfully',
      company: company.name,
      created: result,
    }, { status: 200 });

  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Initialize defaults error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
