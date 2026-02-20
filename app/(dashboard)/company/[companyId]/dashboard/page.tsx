// app/(dashboard)/company/[companyId]/dashboard/page.tsx
// Company Dashboard Page — Cookie-only
// Company name fetched from API, not localStorage

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function CompanyDashboardPage() {
  const params = useParams()
  const companyId = params.companyId as string
  const [companyName, setCompanyName] = useState<string>('')

  // Fetch company name from API instead of localStorage
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch(`/api/account/companies/${companyId}`)
        if (res.ok) {
          const data = await res.json()
          setCompanyName(data.name || 'Unknown Company')
        }
      } catch {
        setCompanyName('Unknown Company')
      }
    }
    fetchCompany()
  }, [companyId])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">📊 Company Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome to {companyName}
        </p>
        <p className="text-sm text-gray-500 font-mono mt-1">
          Company ID: {companyId}
        </p>
      </div>

      {/* Company Info Card */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 border-l-4 border-orange-500">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{companyName}</h3>
            <p className="text-sm text-gray-500">Active Company</p>
          </div>
          <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-mono text-lg font-bold">
            ID: {companyId}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Clients</p>
              <p className="text-3xl font-bold">—</p>
            </div>
            <div className="text-4xl opacity-80">👥</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Products</p>
              <p className="text-3xl font-bold">—</p>
            </div>
            <div className="text-4xl opacity-80">📦</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Sales</p>
              <p className="text-3xl font-bold">—</p>
            </div>
            <div className="text-4xl opacity-80">💰</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Warehouse</p>
              <p className="text-3xl font-bold">—</p>
            </div>
            <div className="text-4xl opacity-80">🏭</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🚀 Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href={`/company/${companyId}/clients`}
            className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium text-gray-700">
            <span>👥</span> Clients
          </Link>
          <Link href={`/company/${companyId}/products`}
            className="flex items-center gap-2 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium text-gray-700">
            <span>📦</span> Products
          </Link>
          <Link href={`/company/${companyId}/sales`}
            className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium text-gray-700">
            <span>💰</span> Sales
          </Link>
          <Link href={`/company/${companyId}/purchases`}
            className="flex items-center gap-2 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium text-gray-700">
            <span>🛒</span> Purchases
          </Link>
        </div>
      </div>
    </div>
  )
}
