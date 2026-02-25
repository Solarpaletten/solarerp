// lib/accounting/periodGuard.ts
// ═══════════════════════════════════════════════════
// Period Guard — Enforces accounting period locks
// ═══════════════════════════════════════════════════
//
// Task 24: Period Locking
//
// Called INSIDE prisma.$transaction() before creating
// any JournalEntry. If the period is closed, throws
// PERIOD_CLOSED error → transaction rollback.
//
// Architecture:
//   Date → extract year/month → check AccountingPeriod
//   If isClosed=true → reject
//   If period doesn't exist → allow (open by default)

import { PrismaClient } from '@prisma/client';

// Transaction client type
type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Check if accounting period is open for a given date.
 * Must be called inside prisma.$transaction().
 *
 * @param tx - Prisma transaction client
 * @param companyId - Company ID
 * @param date - Date of the journal entry
 * @throws Error('PERIOD_CLOSED') if period is locked
 */
export async function assertPeriodOpen(
  tx: TxClient,
  companyId: string,
  date: Date
): Promise<void> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JS months are 0-indexed

  const period = await tx.accountingPeriod.findUnique({
    where: {
      companyId_year_month: {
        companyId,
        year,
        month,
      },
    },
    select: {
      isClosed: true,
      closedAt: true,
    },
  });

  // No period record = open (default behavior)
  // Period exists but isClosed=false = open
  // Period exists and isClosed=true = LOCKED
  if (period?.isClosed) {
    throw new Error(
      `PERIOD_CLOSED: Accounting period ${year}-${String(month).padStart(2, '0')} is closed (locked at ${period.closedAt?.toISOString()}). No journal entries allowed.`
    );
  }
}
