// lib/services/documentNumberService.ts
// ═══════════════════════════════════════════════════════════════
// TASK 58 FIX — Document Number Generator
// Format: {PREFIX}-{YEAR}-{SEQUENCE:05d}
// Examples: PUR-2026-00001, SAL-2026-00042
// ═══════════════════════════════════════════════════════════════
// ⚠️ Concurrency-safe: uses DB-level atomic counter via upsert + increment
// ⚠️ Per-company: sequences are scoped to companyId + prefix + year
// ═══════════════════════════════════════════════════════════════
//
// SCHEMA ADDITION required in prisma/schema.prisma:
//
// model DocumentSequence {
//   id        String   @id @default(cuid())
//   companyId String
//   prefix    String   // PUR | SAL | ADV | etc.
//   year      Int
//   lastSeq   Int      @default(0)
//   updatedAt DateTime @updatedAt
//
//   @@unique([companyId, prefix, year])
//   @@index([companyId])
//   @@map("document_sequences")
// }

import prisma from '@/lib/prisma';

export type DocumentPrefix =
  | 'PUR'   // Purchase invoice
  | 'SAL'   // Sales invoice
  | 'ADV'   // Advance invoice
  | 'CRN'   // Credit note
  | 'WMV'   // Warehouse movement
  | 'JNL';  // Journal entry

/**
 * Generate next document number for a company.
 * Thread-safe via atomic DB increment.
 *
 * @returns formatted string e.g. "PUR-2026-00001"
 */
export async function nextDocumentNumber(
  companyId: string,
  prefix: DocumentPrefix,
  year?: number
): Promise<string> {
  const currentYear = year ?? new Date().getFullYear();

  // Atomic increment using Prisma updateMany with raw increment
  // We upsert the counter record, then read the new value
  const sequence = await (prisma as any).documentSequence.upsert({
    where: {
      companyId_prefix_year: { companyId, prefix, year: currentYear },
    },
    update: {
      lastSeq: { increment: 1 },
    },
    create: {
      companyId,
      prefix,
      year: currentYear,
      lastSeq: 1,
    },
    select: { lastSeq: true },
  });

  const seq = String(sequence.lastSeq).padStart(5, '0');
  return `${prefix}-${currentYear}-${seq}`;
}

/**
 * Preview next number without incrementing.
 * Use for display only — not for actual document creation.
 */
export async function peekNextDocumentNumber(
  companyId: string,
  prefix: DocumentPrefix,
  year?: number
): Promise<string> {
  const currentYear = year ?? new Date().getFullYear();

  const seq = await (prisma as any).documentSequence.findUnique({
    where: {
      companyId_prefix_year: { companyId, prefix, year: currentYear },
    },
    select: { lastSeq: true },
  });

  const nextSeq = String((seq?.lastSeq ?? 0) + 1).padStart(5, '0');
  return `${prefix}-${currentYear}-${nextSeq}`;
}

/**
 * Reset sequence for a company/prefix/year.
 * Admin use only — never call from user-facing code.
 */
export async function resetDocumentSequence(
  companyId: string,
  prefix: DocumentPrefix,
  year: number,
  startFrom = 0
): Promise<void> {
  await (prisma as any).documentSequence.upsert({
    where: { companyId_prefix_year: { companyId, prefix, year } },
    update: { lastSeq: startFrom },
    create: { companyId, prefix, year, lastSeq: startFrom },
  });
}
