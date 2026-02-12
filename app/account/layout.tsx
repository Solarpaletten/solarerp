import { AccountSidebar } from '@/components/layouts/AccountSidebar';

type AccountLayoutProps = {
  children: React.ReactNode;
};

export default function AccountLayout({ children }: AccountLayoutProps) {
  return <AccountSidebar>{children}</AccountSidebar>;
}

