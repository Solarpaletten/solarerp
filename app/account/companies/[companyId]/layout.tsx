import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { CompanySidebar } from '@/components/layouts/CompanySidebar';

type CompanyLayoutProps = {
  children: React.ReactNode;
  params: {
    companyId: string;
  };
};

export default async function CompanyLayout({ children, params }: CompanyLayoutProps) {
  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: { id: true, name: true },
  });

  if (!company) {
    notFound();
  }

  return (
    <CompanySidebar companyId={company.id} companyName={company.name}>
      {children}
    </CompanySidebar>
  );
}

