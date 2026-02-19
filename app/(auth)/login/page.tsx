// app/(auth)/login/page.tsx
// Factory Login — Adapted from Runtime UI
//
// Auth flow:
//   POST /api/auth/login { email, password }
//   → { id, email, tenantId }
//   → localStorage.setItem('userId', id)
//   → redirect to /account/dashboard
//
// NO JWT. NO cookies. NO middleware.
// All subsequent requests use x-user-id header.

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already logged in
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      router.push('/account/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      // Factory auth: store userId for x-user-id header
      localStorage.setItem('userId', data.id);
      localStorage.setItem('userEmail', data.email);
      localStorage.setItem('tenantId', data.tenantId);

      router.push('/account/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">☀️</span>
          <span className="text-white font-bold text-lg">Solar ERP</span>
        </div>
        <div className="text-sm text-slate-400">
          Factory Architecture
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
                <span className="text-white text-2xl">☀️</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in to Solar ERP</h1>
              <p className="text-gray-500 text-sm">Multi-Tenant ERP Platform</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                  placeholder="admin@solar.local"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400">Test credentials</span>
              </div>
            </div>

            {/* Test Credentials */}
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Email:</span>{' '}
                  <code className="text-gray-700 font-mono text-xs bg-white px-1.5 py-0.5 rounded">admin@solar.local</code>
                </div>
                <div>
                  <span className="text-gray-400">Pass:</span>{' '}
                  <code className="text-gray-700 font-mono text-xs bg-white px-1.5 py-0.5 rounded">admin123</code>
                </div>
              </div>
            </div>

            {/* Sign up link */}
            <p className="mt-6 text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-blue-600 hover:underline font-medium">Create account</Link>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-500 mt-6">
            Solar ERP v2 — Factory Architecture • PostgreSQL + Prisma
          </p>
        </div>
      </div>
    </div>
  );
}
