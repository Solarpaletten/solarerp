// app/api/company/[companyId]/chart-of-accounts/import/route.ts
// ═══════════════════════════════════════════════════
// Chart of Accounts Import Engine
// ═══════════════════════════════════════════════════
//
// Task 30: Import CSV → batch create Account records.
//
// Rules:
//   - Duplicates by code+companyId → skip (not error)
//   - Valid AccountType required
//   - Atomic via transaction
//   - No deletes, no updates — pure add-import

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
  name: string;
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

  // Validate header
  const header = lines[0].toLowerCase().trim();
  if (!header.includes('code') || !header.includes('name') || !header.includes('type')) {
    errors.push('CSV header must contain: code, name, type');
    return { rows, errors };
  }

  // Parse header positions
  const headerCols = header.split(',').map((h) => h.trim());
  const codeIdx = headerCols.indexOf('code');
  const nameIdx = headerCols.indexOf('name');
  const typeIdx = headerCols.indexOf('type');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',');
    const code = (cols[codeIdx] || '').trim();
    const name = (cols[nameIdx] || '').trim();
    const type = (cols[typeIdx] || '').trim().toUpperCase();

    if (!code) {
      errors.push(`Row ${i + 1}: missing code`);
      continue;
    }
    if (!name) {
      errors.push(`Row ${i + 1}: missing name`);
      continue;
    }
    if (!VALID_TYPES.has(type)) {
      errors.push(`Row ${i + 1}: invalid type "${type}" (must be ASSET/LIABILITY/EQUITY/INCOME/EXPENSE)`);
      continue;
    }

    rows.push({ code, name, type: type as AccountType });
  }

  return { rows, errors };
}

// ─── POST /api/company/[companyId]/chart-of-accounts/import ─
//
// Body: raw CSV text (Content-Type: text/csv)
// or JSON: { "csv": "code,name,type\n1000,Bank,ASSET\n..." }
//
// Response:
// {
//   "created": 247,
//   "skipped": 3,
//   "totalInFile": 250,
//   "errors": []
// }
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ─── Read CSV from body ──────────────────────
    let csvText: string;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      csvText = body.csv;
      if (!csvText) {
        return NextResponse.json(
          { error: 'JSON body must have "csv" field' },
          { status: 400 }
        );
      }
    } else {
      // text/csv or multipart form — read as text
      csvText = await request.text();
    }

    if (!csvText || csvText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Empty CSV body' },
        { status: 400 }
      );
    }

    // ─── Parse CSV ───────────────────────────────
    const { rows, errors } = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows in CSV', parseErrors: errors },
        { status: 400 }
      );
    }

    // ─── Find existing codes to skip duplicates ──
    const existingAccounts = await prisma.account.findMany({
      where: { companyId },
      select: { code: true },
    });
    const existingCodes = new Set(existingAccounts.map((a) => a.code));

    const toCreate = rows.filter((r) => !existingCodes.has(r.code));
    const skipped = rows.length - toCreate.length;

    // ─── Batch create in transaction ─────────────
    let created = 0;
    if (toCreate.length > 0) {
      const result = await prisma.$transaction(async (tx) => {
        // createMany for performance
        const batch = await tx.account.createMany({
          data: toCreate.map((r) => ({
            companyId,
            code: r.code,
            name: r.name,
            type: r.type,
            isActive: true,
          })),
          skipDuplicates: true, // Extra safety net
        });
        return batch.count;
      });
      created = result;
    }

    return NextResponse.json({
      created,
      skipped,
      totalInFile: rows.length,
      ...(errors.length > 0 ? { parseErrors: errors } : {}),
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Import chart of accounts error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
