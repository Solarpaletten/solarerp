// app/api/company/[companyId]/chart-of-accounts/import/skr03/route.ts
// ═══════════════════════════════════════════════════
// SKR03 Quick Import — DATEV+ Enterprise Level
// ═══════════════════════════════════════════════════
//
// POST /api/company/:id/chart-of-accounts/import/skr03?mode=merge|reset
//
// Modes:
//   merge (default) — add missing accounts, skip existing (idempotent)
//   reset — delete non-system, non-used accounts, then re-import full SKR03
//
// Safety guarantees:
//   ✅ Tenant isolation (requireTenant + company ownership check)
//   ✅ Stammkonten never deleted in reset mode
//   ✅ Accounts with journal entries never deleted in reset mode
//   ✅ skipDuplicates + pre-filter = idempotent (5 clicks = same result)
//   ✅ @@unique([companyId, code]) = DB-level duplicate protection
//   ✅ Single $transaction for atomicity

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import prisma from '@/lib/prisma';
import { requireTenant } from '@/lib/auth/requireTenant';
import { AccountType } from '@prisma/client';
import { PROTECTED_ACCOUNT_CODES } from '@/lib/accounting/protectedAccounts';

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

const VALID_TYPES = new Set<string>(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']);

// ─── Tenant-scoped company check ─────────────────
async function verifyCompanyOwnership(companyId: string, tenantId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  return company !== null;
}

// ─── CSV Parser ──────────────────────────────────
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
    errors.push('CSV must have header + data');
    return { rows, errors };
  }

  const header = lines[0].toLowerCase().trim();
  const cols = header.split(',').map(h => h.trim());

  const codeIdx = cols.indexOf('code');
  const typeIdx = cols.indexOf('type');
  const nameDeIdx = cols.indexOf('namede');
  const nameEnIdx = cols.indexOf('nameen');
  const nameIdx = cols.indexOf('name');

  if (codeIdx === -1 || typeIdx === -1) {
    errors.push('CSV must have "code" and "type" columns');
    return { rows, errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',').map(p => p.trim());
    const code = parts[codeIdx];
    const typeStr = parts[typeIdx]?.toUpperCase();

    if (!code || !typeStr) { errors.push(`Line ${i + 1}: missing code or type`); continue; }
    if (!VALID_TYPES.has(typeStr)) { errors.push(`Line ${i + 1}: invalid type "${typeStr}"`); continue; }

    let nameDe = '';
    let nameEn = '';

    if (nameDeIdx !== -1) {
      nameDe = parts[nameDeIdx] || code;
      nameEn = nameEnIdx !== -1 ? (parts[nameEnIdx] || nameDe) : nameDe;
    } else if (nameIdx !== -1) {
      nameDe = parts[nameIdx] || code;
      nameEn = nameDe;
    } else {
      nameDe = code;
      nameEn = code;
    }

    rows.push({ code, nameDe, nameEn, type: typeStr as AccountType });
  }

  return { rows, errors };
}

// ─── HANDLER ─────────────────────────────────────
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // ═══ SECURITY: Tenant isolation ══════════════
    const { tenantId } = await requireTenant(request);
    const { companyId } = await params;

    const isOwner = await verifyCompanyOwnership(companyId, tenantId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ═══ Read built-in SKR03 CSV ═════════════════
    let csvText: string;
    try {
      const csvPath = join(process.cwd(), 'lib', 'accounting', 'data', 'skr03.csv');
      csvText = readFileSync(csvPath, 'utf-8');
    } catch {
      return NextResponse.json({ error: 'SKR03 dataset not found on server' }, { status: 500 });
    }

    const { rows, errors: parseErrors } = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows in SKR03 dataset', parseErrors },
        { status: 500 }
      );
    }

    // ═══ Mode selection ══════════════════════════
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'merge';

    if (mode !== 'merge' && mode !== 'reset') {
      return NextResponse.json(
        { error: 'Invalid mode. Use ?mode=merge (default) or ?mode=reset' },
        { status: 400 }
      );
    }

    // ═══ Execute in transaction ══════════════════
    const result = await prisma.$transaction(async (tx) => {
      let deletedCount = 0;
      let protectedFromDelete = 0;

      if (mode === 'reset') {
        // ─── RESET MODE ──────────────────────────
        // Step 1: Find accounts that CANNOT be deleted
        //   a) Stammkonten (system accounts from ACCOUNT_MAP)
        //   b) Accounts with journal entries (have JournalLine references)

        // Find all account IDs that have journal lines
        const usedAccountIds = await tx.journalLine.groupBy({
          by: ['accountId'],
          where: {
            account: { companyId },
          },
        });
        const usedIdSet = new Set(usedAccountIds.map(u => u.accountId));

        // Load all current accounts
        const allAccounts = await tx.account.findMany({
          where: { companyId },
          select: { id: true, code: true },
        });

        // Classify
        const deletableIds: string[] = [];
        for (const acc of allAccounts) {
          const isStammkonto = PROTECTED_ACCOUNT_CODES.has(acc.code);
          const hasEntries = usedIdSet.has(acc.id);

          if (isStammkonto || hasEntries) {
            protectedFromDelete++;
          } else {
            deletableIds.push(acc.id);
          }
        }

        // Delete only safe accounts
        if (deletableIds.length > 0) {
          const deleteResult = await tx.account.deleteMany({
            where: { id: { in: deletableIds }, companyId },
          });
          deletedCount = deleteResult.count;
        }
      }

      // ─── MERGE / CREATE ────────────────────────
      // Both modes: add accounts that don't exist yet

      // Get current codes after potential deletion
      const existing = await tx.account.findMany({
        where: { companyId },
        select: { code: true },
      });
      const existingCodes = new Set(existing.map(a => a.code));

      const toCreate = rows.filter(r => !existingCodes.has(r.code));
      const skipped = rows.length - toCreate.length;

      let created = 0;
      if (toCreate.length > 0) {
        // createMany with skipDuplicates = belt + suspenders
        // Pre-filter above handles known duplicates
        // skipDuplicates handles race conditions / @@unique constraint
        const batch = await tx.account.createMany({
          data: toCreate.map(r => ({
            companyId,
            code: r.code,
            nameDe: r.nameDe,
            nameEn: r.nameEn,
            type: r.type,
            isActive: true,
          })),
          skipDuplicates: true,
        });
        created = batch.count;
      }

      return {
        mode,
        created,
        skipped,
        totalInFile: rows.length,
        ...(mode === 'reset' ? {
          deleted: deletedCount,
          protectedFromDelete,
        } : {}),
        ...(parseErrors.length > 0 ? { parseErrors } : {}),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('SKR03 import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
