// lib/accounting/journalService.ts
// ═══════════════════════════════════════════════════
// Journal Service — Creates journal entries for documents
// ═══════════════════════════════════════════════════
//
// Architecture:
//   Document → JournalEntry → JournalLine[]
//   All within a single Prisma transaction
//
// Rule: Document is the event. Journal is the truth.
//
// Task 24 MVP: Period Lock — second enforcement contour.
// assertPeriodOpen() called before creating any JournalEntry.

import { Prisma, PrismaClient } from '@prisma/client';
import { assertPeriodOpen } from './periodLock';

// Transaction client type (subset of PrismaClient used inside $transaction)
type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export type JournalLineInput = {
  accountId: string;
  debit: number;
  credit: number;
};

export type CreateJournalEntryInput = {
  companyId: string;
  date: Date;
  documentType: string; // 'SALE' | 'PURCHASE' | 'SALE_REVERSAL' | 'PURCHASE_REVERSAL'
  documentId: string;
  lines: JournalLineInput[];
};

// ─── VALIDATION ──────────────────────────────────
// Double-entry: sum(debit) must equal sum(credit)
function validateJournalLines(lines: JournalLineInput[]): void {
  if (lines.length < 2) {
    throw new Error('Journal entry must have at least 2 lines');
  }

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

  // Allow tiny floating point difference (< 0.01)
  if (Math.abs(totalDebit - totalCredit) >= 0.01) {
    throw new Error(
      `Journal entry is unbalanced: debit=${totalDebit.toFixed(2)}, credit=${totalCredit.toFixed(2)}`
    );
  }

  for (const line of lines) {
    if (line.debit < 0 || line.credit < 0) {
      throw new Error('Debit and credit must be non-negative');
    }
    if (line.debit > 0 && line.credit > 0) {
      throw new Error('A journal line cannot have both debit and credit');
    }
    if (line.debit === 0 && line.credit === 0) {
      throw new Error('A journal line must have either debit or credit');
    }
  }
}

// ─── CREATE JOURNAL ENTRY ────────────────────────
// Must be called inside prisma.$transaction()
// Returns the created JournalEntry with lines
//
// Task 24 MVP: Period lock check (second contour)
export async function createJournalEntry(
  tx: TxClient,
  input: CreateJournalEntryInput
) {
  // *** Task 24: Period Lock — second contour ***
  await assertPeriodOpen(tx, {
    companyId: input.companyId,
    date: input.date,
  });

  // Validate double-entry balance
  validateJournalLines(input.lines);

  // Verify all accounts exist and belong to the company
  const accountIds = input.lines.map((l) => l.accountId);
  const accounts = await tx.account.findMany({
    where: {
      id: { in: accountIds },
      companyId: input.companyId,
    },
    select: { id: true },
  });

  const foundIds = new Set(accounts.map((a) => a.id));
  const missing = accountIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Accounts not found in this company: ${missing.join(', ')}`
    );
  }

  // Create JournalEntry + JournalLines atomically
  const entry = await tx.journalEntry.create({
    data: {
      companyId: input.companyId,
      date: input.date,
      documentType: input.documentType,
      documentId: input.documentId,
      lines: {
        create: input.lines.map((line) => ({
          accountId: line.accountId,
          debit: new Prisma.Decimal(line.debit),
          credit: new Prisma.Decimal(line.credit),
        })),
      },
    },
    include: {
      lines: true,
    },
  });

  return entry;
}
