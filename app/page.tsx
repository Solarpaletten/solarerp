// app/page.tsx
// Factory Entry Gate — client-side auth check
// No middleware. No JWT. No cookies.
// Just localStorage → redirect.

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem('userId');

    if (userId) {
      // Authenticated → go to dashboard
      router.replace('/account/dashboard');
    } else {
      // Not authenticated → go to login
      router.replace('/login');
    }
  }, [router]);

  // Brief loading state while checking
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <span className="text-4xl block mb-3">☀️</span>
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}
