// app/(auth)/signup/page.tsx
// Factory Signup — creates tenant + user
// After success: redirects to /login (does NOT auto-login)

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [agree, setAgree] = useState(false)


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tenantName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Success → show message, then redirect to login
      setSuccess(true);
      setTimeout(() => {
        router.replace('/login');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Navigation bar */}
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-blue-600">SOLAR ERP</div>
        <div className="flex space-x-4">
          <a href="#" className="text-gray-600 hover:text-blue-600">
            Product
          </a>
          <a href="#" className="text-gray-600 hover:text-blue-600">
            Integrations
          </a>
          <a href="#" className="text-gray-600 hover:text-blue-600">
            Training
          </a>
          <a href="#" className="text-gray-600 hover:text-blue-600">
            Prices
          </a>
          <a href="#" className="text-gray-600 hover:text-blue-600">
            Accounting Companies
          </a>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <Link
              href="/login"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Registration form */}
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">📝</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Create Account
              </h1>
              <p className="text-gray-600">Join Solar ERP Today</p>
            </div>

            {/* Social Login */}
            <div className="flex justify-center space-x-2 mb-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Facebook
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                Google
              </button>
            </div>
            <p className="text-center text-gray-600 mb-4">
              Or fill out the registration form
            </p>

            {successMessage && (
              <div className="p-4 text-sm text-green-700 bg-green-100 border border-green-300 rounded-lg mb-4">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="p-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}  
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="text"
                  name="phone" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="surname"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="text-blue-500 hover:underline">
                    terms and conditions
                  </a>
                </label>
              </div>

              {/* Development autofill button (hidden) */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  type="button"
                  hidden
                  onClick={() =>
                    setFormData({
                      email: 'test@example.com',
                      phone: '+49123456789',
                      name: 'Test',
                      surname: 'User',
                      password: 'test1234',
                      username: 'testuser',
                    })
                  }
                >
                  Autofill
                </button>
              )}

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                Create Account
              </button>
            </form>

            {/* Development Info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">🔧 Development Mode:</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• Form is auto-filled for testing</p>
                  <p>• Terms checkbox is pre-checked</p>
                  <p>• After registration, you'll be redirected to login</p>
                </div>
              </div>
            )}
          </div>

          {/* Login Link */}
          <div className="text-center mt-6">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white p-4 text-center text-sm text-gray-500">
        <p>&copy; 2025 Solar ERP. Advanced Enterprise Resource Planning.</p>
      </div>
    </div>
  )
}