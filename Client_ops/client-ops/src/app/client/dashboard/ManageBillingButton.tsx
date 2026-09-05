'use client'

import { useState } from 'react'
import { CreditCard, Loader2, ExternalLink } from 'lucide-react'

export default function ManageBillingButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleManageBilling() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()

      if (res.ok && json.url) {
        window.location.href = json.url
      } else {
        setError(json.error || 'Failed to open billing portal')
        setLoading(false)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error')
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
      <button
        id="manage-billing-btn"
        className="btn btn-primary btn-lg"
        onClick={handleManageBilling}
        disabled={loading}
        style={{ gap: 10 }}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="spin" />
            Opening Stripe Portal…
          </>
        ) : (
          <>
            <CreditCard size={18} />
            Manage Billing & Payment Methods
            <ExternalLink size={14} style={{ opacity: 0.8 }} />
          </>
        )}
      </button>

      {error && (
        <div style={{
          color: 'var(--color-danger)',
          background: 'var(--color-danger-dim)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 14px',
          fontSize: '0.8rem',
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}
