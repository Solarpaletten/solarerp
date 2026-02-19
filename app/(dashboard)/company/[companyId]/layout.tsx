// app/account/companies/[companyId]/layout.tsx
// Company Layout — Factory-compatible
// Fetches company name from Factory API and renders CompanySidebar

import { CompanySidebar } from '@/components/layouts/CompanySidebar';
import prisma from '@/lib/prisma';

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  // Fetch company name server-side (Factory Prisma, no runtime deps)
  let companyName = 'Company';
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });
    if (company) companyName = company.name;
  } catch {
    // Fallback to generic name
  }

  return (
    <CompanySidebar companyId={companyId} companyName={companyName}>
      {children}
    </CompanySidebar>
  );
}
