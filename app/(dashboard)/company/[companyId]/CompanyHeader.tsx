// app/(dashboard)/company/[companyId]/CompanyHeader.tsx
// Cookie-only — company name and header element positions from API/state
// No localStorage for auth or company name

'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { GripVertical } from 'lucide-react'

interface HeaderElement {
  id: string;
  type: 'button' | 'info' | 'avatar';
  content: string | React.ReactNode;
  position: 'left' | 'center' | 'right';
  priority: number;
}

const CompanyHeader: React.FC = () => {
  const params = useParams()
  const companyId = params.companyId as string

  const [companyName, setCompanyName] = useState('')
  const [balance] = useState(0)
  
  const [headerElements, setHeaderElements] = useState<HeaderElement[]>([
    { id: 'invite', type: 'button', content: 'Invite users', position: 'left', priority: 1 },
    { id: 'minimal', type: 'button', content: 'Minimal', position: 'left', priority: 2 },
    { id: 'balance', type: 'info', content: 'Balance 0.00 €', position: 'left', priority: 3 },
    { id: 'partnership', type: 'info', content: 'Partnership points 0.00 €', position: 'left', priority: 4 },
    { id: 'avatar', type: 'avatar', content: '', position: 'right', priority: 5 },
  ])

  const [draggedElement, setDraggedElement] = useState<HeaderElement | null>(null)
  const [draggedOver, setDraggedOver] = useState<'left' | 'center' | 'right' | null>(null)

  // Fetch company name from API instead of localStorage
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch(`/api/account/companies/${companyId}`)
        if (res.ok) {
          const data = await res.json()
          setCompanyName(data.name || 'Company')
        }
      } catch {
        setCompanyName('Company')
      }
    }
    fetchCompany()
  }, [companyId])

  const handleDragStart = (e: React.DragEvent, element: HeaderElement) => {
    setDraggedElement(element)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, zone: 'left' | 'center' | 'right') => {
    e.preventDefault()
    setDraggedOver(zone)
  }

  const handleDrop = (e: React.DragEvent, zone: 'left' | 'center' | 'right') => {
    e.preventDefault()
    if (!draggedElement) return

    setHeaderElements(prev =>
      prev.map(el =>
        el.id === draggedElement.id ? { ...el, position: zone } : el
      )
    )
    setDraggedElement(null)
    setDraggedOver(null)
  }

  const renderElement = (element: HeaderElement) => {
    switch (element.type) {
      case 'button':
        return (
          <button
            key={element.id}
            draggable
            onDragStart={(e) => handleDragStart(e, element)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-3 h-3 text-slate-500" />
            {element.content}
          </button>
        )
      case 'info':
        return (
          <div
            key={element.id}
            draggable
            onDragStart={(e) => handleDragStart(e, element)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-300 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-3 h-3 text-slate-500" />
            {element.content}
          </div>
        )
      case 'avatar':
        return (
          <div
            key={element.id}
            draggable
            onDragStart={(e) => handleDragStart(e, element)}
            className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold cursor-grab active:cursor-grabbing"
          >
            {companyName.charAt(0).toUpperCase() || '?'}
          </div>
        )
    }
  }

  const leftElements = headerElements.filter(e => e.position === 'left').sort((a, b) => a.priority - b.priority)
  const centerElements = headerElements.filter(e => e.position === 'center').sort((a, b) => a.priority - b.priority)
  const rightElements = headerElements.filter(e => e.position === 'right').sort((a, b) => a.priority - b.priority)

  return (
    <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center px-4">
      {/* Left Zone */}
      <div
        className={`flex items-center gap-2 flex-1 min-h-[40px] rounded-lg transition-colors ${
          draggedOver === 'left' ? 'bg-slate-700/50' : ''
        }`}
        onDragOver={(e) => handleDragOver(e, 'left')}
        onDrop={(e) => handleDrop(e, 'left')}
        onDragLeave={() => setDraggedOver(null)}
      >
        {leftElements.map(renderElement)}
      </div>

      {/* Center Zone */}
      <div
        className={`flex items-center justify-center gap-2 flex-1 min-h-[40px] rounded-lg transition-colors ${
          draggedOver === 'center' ? 'bg-slate-700/50' : ''
        }`}
        onDragOver={(e) => handleDragOver(e, 'center')}
        onDrop={(e) => handleDrop(e, 'center')}
        onDragLeave={() => setDraggedOver(null)}
      >
        {centerElements.map(renderElement)}
      </div>

      {/* Right Zone */}
      <div
        className={`flex items-center justify-end gap-2 flex-1 min-h-[40px] rounded-lg transition-colors ${
          draggedOver === 'right' ? 'bg-slate-700/50' : ''
        }`}
        onDragOver={(e) => handleDragOver(e, 'right')}
        onDrop={(e) => handleDrop(e, 'right')}
        onDragLeave={() => setDraggedOver(null)}
      >
        {rightElements.map(renderElement)}
      </div>
    </div>
  )
}

export default CompanyHeader
