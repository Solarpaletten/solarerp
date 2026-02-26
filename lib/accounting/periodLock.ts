// lib/accounting/periodLock.ts
// ═══════════════════════════════════════════════════
// Period Lock — Enforces accounting period closures
// ═══════════════════════════════════════════════════
//
// Task 24 MVP: Period Locking
//
// Called INSIDE prisma.$transaction() before creating
// documents or journal entries in a given period.
// If period is closed → throws PERIOD_CLOSED → rollback.
//
// Rule: No record = open (default). Only explicit close blocks.

import { PrismaClient } from '@prisma/client';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Extract year and month from a Date.
 */
export function getPeriodKey(date: Date): { year: number; month: number } {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1, // JS months 0-indexed
  };
}

/**
 * Assert that the accounting period for the given date is open.
 * Must be called inside prisma.$transaction().
 *
 * @throws Error('PERIOD_CLOSED') if period is locked
 */
export async function assertPeriodOpen(
  tx: TxClient,
  params: { companyId: string; date: Date }
): Promise<void> {
  const { year, month } = getPeriodKey(params.date);

  const period = await tx.accountingPeriod.findUnique({
    where: {
      companyId_year_month: {
        companyId: params.companyId,
        year,
        month,
      },
    },
    select: { isClosed: true },
  });

  // No record = open. isClosed=false = open.
  if (period?.isClosed) {
    throw new Error(
      `PERIOD_CLOSED: ${year}-${String(month).padStart(2, '0')} is closed`
    );
  }
}
