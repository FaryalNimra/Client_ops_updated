'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ArrowRight, Loader2, ShieldCheck, Mail, Building } from 'lucide-react'

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [syncing, setSyncing] = useState(true)
  const [data, setData] = useState<{
    business_name?: string
    customer_email?: string
    client_id?: string
  } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function syncPayment() {
      if (!sessionId) {
        setSyncing(false)
        return
      }

      try {
        const res = await fetch('/api/stripe/sync-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })
        const json = await res.json()
        if (json.success) {
          setData(json)
        } else {
          setError(json.error || json.message || 'Payment received, status updating…')
        }
      } catch {
        setError('Payment received. Your dashboard is updating.')
      } finally {
        setSyncing(false)
      }
    }

    syncPayment()
  }, [sessionId])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '24px',
    }}>
      <div className="card animate-in" style={{
        maxWidth: 540,
        width: '100%',
        padding: '40px 32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--color-border)',
      }}>
        {/* Animated Success Icon */}
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(34, 197, 94, 0.15)',
          color: '#22C55E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
        }}>
          {syncing ? <Loader2 size={36} className="spinner" /> : <CheckCircle2 size={40} />}
        </div>

        <div>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '4px 12px',
            borderRadius: 99,
            background: 'rgba(34, 197, 94, 0.12)',
            color: '#22C55E',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}>
            ✓ Subscription Active
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 12, color: 'var(--color-text)' }}>
            Payment Successful!
          </h1>
          <p className="text-muted" style={{ fontSize: '0.92rem', marginTop: 6, lineHeight: 1.5 }}>
            Thank you for subscribing to <strong>Landing Page Care</strong>. Your account has been verified and your status is now active across all systems.
          </p>
          {error && (
            <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#F59E0B' }}>
              {error}
            </div>
          )}
        </div>

        {/* Customer & Account Details */}
        {(data?.customer_email || data?.business_name) && (
          <div style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            width: '100%',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            fontSize: '0.88rem',
          }}>
            {data.business_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text)' }}>
                <Building size={16} color="var(--color-primary)" />
                <span>Account: <strong>{data.business_name}</strong></span>
              </div>
            )}
            {data.customer_email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text)' }}>
                <Mail size={16} color="var(--color-primary)" />
                <span>Billing Email: <strong>{data.customer_email}</strong></span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#22C55E', fontWeight: 600 }}>
              <ShieldCheck size={16} />
              <span>Status: Paid & Active</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ width: '100%', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link
            href="/auth?role=client"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', gap: 8, fontSize: '1rem' }}
          >
            <span>Log in to Client Portal</span>
            <ArrowRight size={16} />
          </Link>

          <Link
            href="/"
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ← Return to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="spinner" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
