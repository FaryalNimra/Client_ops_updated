'use client'

import React from 'react'

interface MonthFilterProps {
  basePrefix: string
  currentMonth?: string
}

export default function MonthFilter({ basePrefix, currentMonth = '' }: MonthFilterProps) {
  return (
    <select
      className="form-select"
      style={{ minWidth: 160 }}
      onChange={e => {
        if (e.target.value) {
          window.location.href = `${basePrefix}/invoices?month=${e.target.value}`
        } else {
          window.location.href = `${basePrefix}/invoices`
        }
      }}
      defaultValue={currentMonth}
    >
      <option value="">All months</option>
      {Array.from({ length: 12 }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return (
          <option key={val} value={val}>
            {d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </option>
        )
      })}
    </select>
  )
}
