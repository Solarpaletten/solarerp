// app/api/company/[companyId]/chart-of-accounts/import/route.ts
// ═══════════════════════════════════════════════════
// Chart of Accounts Import Engine (v2 — Bilingual)
// ═══════════════════════════════════════════════════
//
// Task 32: Bilingual import with optional reset.
//
// CSV format: code,nameDe,nameEn,type
// Also supports legacy: code,name,type (name → nameDe, nameEn=nameDe)
//
// Modes:
//   - Default: add-only (skip duplicates)
//   - ?reset=true: delete all existing accounts first
//     (only if no journal lines reference them)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { AccountType } from '@prisma/client';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

const VALID_TYPES = new Set<string>(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']);

async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

type ParsedRow = {
  code: string;
  nameDe: string;
  nameEn: string;
  type: AccountType;
};

function parseCSV(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text.trim().split('\n');
  const errors: string[] = [];
  const rows: ParsedRow[] = [];

  if (lines.length < 2) {
    errors.push('CSV must have a header row and at least one data row');
    return { rows, errors };
  }

  const header = lines[0].toLowerCase().trim();
  const headerCols = header.split(',').map((h) => h.trim());

  // Detect format: bilingual (code,nameDe,nameEn,type) or legacy (code,name,type)
  const codeIdx = headerCols.indexOf('code');
  const typeIdx = headerCols.indexOf('type');
  const nameDeIdx = headerCols.indexOf('namede');
  const nameEnIdx = headerCols.indexOf('nameen');
  const nameIdx = headerCols.indexOf('name'); // legacy

  if (codeIdx === -1 || typeIdx === -1) {
    errors.push('CSV header must contain: code, type');
    return { rows, errors };
  }

  const isBilingual = nameDeIdx !== -1 && nameEnIdx !== -1;
  if (!isBilingual && nameIdx === -1) {
    errors.push('CSV header must contain: nameDe+nameEn (bilingual) or name (legacy)');
    return { rows, errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle commas inside values (simple: no quotes)
    const cols = line.split(',');
    const code = (cols[codeIdx] || '').trim();
    const type = (cols[typeIdx] || '').trim().toUpperCase();

    let nameDe: string;
    let nameEn: string;

    if (isBilingual) {
      nameDe = (cols[nameDeIdx] || '').trim();
      nameEn = (cols[nameEnIdx] || '').trim();
    } else {
      nameDe = (cols[nameIdx] || '').trim();
      nameEn = nameDe; // Legacy fallback
    }

    if (!code) {
      errors.push(`Row ${i + 1}: missing code`);
      continue;
    }
    if (!nameDe) {
      errors.push(`Row ${i + 1}: missing name`);
      continue;
    }
    if (!VALID_TYPES.has(type)) {
      errors.push(`Row ${i + 1}: invalid type "${type}"`);
      continue;
    }

    rows.push({ code, nameDe, nameEn: nameEn || nameDe, type: type as AccountType });
  }

  return { rows, errors };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check reset mode
    const url = new URL(request.url);
    const resetMode = url.searchParams.get('reset') === 'true';

    // Read CSV
    let csvText: string;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      csvText = body.csv;
      if (!csvText) {
        return NextResponse.json({ error: 'JSON body must have "csv" field' }, { status: 400 });
      }
    } else {
      csvText = await request.text();
    }

    if (!csvText || csvText.trim().length === 0) {
      return NextResponse.json({ error: 'Empty CSV body' }, { status: 400 });
    }

    const { rows, errors } = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows in CSV', parseErrors: errors },
        { status: 400 }
      );
    }

    // Reset mode: check for journal line references first
    let deletedCount = 0;
    if (resetMode) {
      const usedAccounts = await prisma.journalLine.findFirst({
        where: {
          account: { companyId },
        },
        select: { id: true },
      });

      if (usedAccounts) {
        return NextResponse.json(
          {
            error: 'Cannot reset: accounts have journal entries. Delete journal entries first or use add-only mode.',
          },
          { status: 409 }
        );
      }

      // Safe to delete all accounts
      const deleteResult = await prisma.account.deleteMany({
        where: { companyId },
      });
      deletedCount = deleteResult.count;
    }

    // Find existing codes to skip duplicates
    const existingAccounts = await prisma.account.findMany({
      where: { companyId },
      select: { code: true },
    });
    const existingCodes = new Set(existingAccounts.map((a) => a.code));

    const toCreate = rows.filter((r) => !existingCodes.has(r.code));
    const skipped = rows.length - toCreate.length;

    // Batch create
    let created = 0;
    if (toCreate.length > 0) {
      const result = await prisma.$transaction(async (tx) => {
        const batch = await tx.account.createMany({
          data: toCreate.map((r) => ({
            companyId,
            code: r.code,
            nameDe: r.nameDe,
            nameEn: r.nameEn,
            type: r.type,
            isActive: true,
          })),
          skipDuplicates: true,
        });
        return batch.count;
      });
      created = result;
    }

    return NextResponse.json({
      created,
      skipped,
      totalInFile: rows.length,
      ...(resetMode ? { deleted: deletedCount } : {}),
      ...(errors.length > 0 ? { parseErrors: errors } : {}),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Import chart of accounts error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
