import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Card } from '@/components/ui/Card';

type CompanyPageProps = {
  params: {
    companyId: string;
  };
};

export default async function CompanyDashboardPage({ params }: CompanyPageProps) {
  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    include: {
      _count: {
        select: {
          clients: true,
          items: true,
          saleDocuments: true,
          purchaseDocuments: true,
        },
      },
    },
  });

  if (!company) {
    notFound();
  }

  const stats = [
    { label: 'Clients', value: company._count.clients, icon: '👥', color: 'blue' },
    { label: 'Items', value: company._count.items, icon: '📦', color: 'green' },
    { label: 'Sales', value: company._count.saleDocuments, icon: '💰', color: 'purple' },
    { label: 'Purchases', value: company._count.purchaseDocuments, icon: '🛒', color: 'orange' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
          {company.code && <span>Code: {company.code}</span>}
          {company.vatNumber && <span>VAT: {company.vatNumber}</span>}
          {company.country && <span>Country: {company.country}</span>}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            company.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
            company.status === 'FROZEN' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {company.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="flex items-center gap-4">
              <div className="text-3xl">{stat.icon}</div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { name: 'New Client', href: `/account/companies/${company.id}/clients/new`, icon: '➕👥' },
          { name: 'New Item', href: `/account/companies/${company.id}/items/new`, icon: '➕📦' },
          { name: 'New Sale', href: `/account/companies/${company.id}/sales/new`, icon: '➕💰' },
          { name: 'New Purchase', href: `/account/companies/${company.id}/purchases/new`, icon: '➕🛒' },
        ].map((action) => (
          <a
            key={action.name}
            href={action.href}
            className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="text-xl">{action.icon}</span>
            <span className="text-sm font-medium text-gray-700">{action.name}</span>
          </a>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm text-gray-500">
        <p>Company ID: {company.id}</p>
        <p>Created: {new Date(company.createdAt).toLocaleDateString()}</p>
        <p>Updated: {new Date(company.updatedAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

