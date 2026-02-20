// app/page.tsx
// Root redirect — no localStorage check needed
// Middleware handles auth: no cookie → /login, cookie exists → allow through

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Always try to go to companies.
    // If no session cookie, middleware will redirect to /login.
    router.replace('/account/companies');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}
