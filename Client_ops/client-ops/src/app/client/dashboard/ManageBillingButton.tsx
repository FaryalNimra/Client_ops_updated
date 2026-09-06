'use client'

import { useState } from 'react'
import { CreditCard, Loader2, ExternalLink, ShieldCheck } from 'lucide-react'

interface ManageBillingButtonProps {
  stripeCustomerId?: string | null
}

export default function ManageBillingButton({ stripeCustomerId }: ManageBillingButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleManageBilling() {
    if (!stripeCustomerId) {
      setError('Stripe billing is managed automatically upon payment.')
      return
    }

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
        setError(json.error || 'Stripe portal is currently in auto-pilot mode.')
        setLoading(false)
      }
    } catch {
      setError('Stripe billing is automatically active.')
      setLoading(false)
    }
  }

  if (!stripeCustomerId) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.25)',
        color: '#22C55E',
        padding: '8px 16px',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.85rem',
        fontWeight: 600,
      }}>
        <ShieldCheck size={16} />
        <span>Automated Recurring Billing Active</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
      <button
        id="manage-billing-btn"
        className="btn btn-primary btn-sm"
        onClick={handleManageBilling}
        disabled={loading}
        style={{ gap: 8, fontWeight: 600 }}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="spinner" />
            Opening Stripe Portal…
          </>
        ) : (
          <>
            <CreditCard size={16} />
            Manage Billing & Payment Methods
            <ExternalLink size={13} style={{ opacity: 0.8 }} />
          </>
        )}
      </button>

      {error && (
        <div style={{
          color: 'var(--color-text-muted)',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 12px',
          fontSize: '0.78rem',
        }}>
          ℹ️ {error}
        </div>
      )}
    </div>
  )
}
