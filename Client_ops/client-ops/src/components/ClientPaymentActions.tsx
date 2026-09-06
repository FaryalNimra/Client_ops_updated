'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link as LinkIcon, Check, Copy, ExternalLink, MessageCircle, Mail, RefreshCw, Loader2 } from 'lucide-react'

interface ClientPaymentActionsProps {
  client: {
    id: string
    business_name: string
    contact_name: string | null
    email: string
    phone: string | null
    status: string
    currency: string | null
    plan_price_cents: number | null
    setup_fee_cents: number | null
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    org_id: string
  }
}

export default function ClientPaymentActions({ client }: ClientPaymentActionsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [syncMessage, setSyncMessage] = useState('')

  const isPaid = client.status === 'active' || !!client.stripe_subscription_id
  const currency = client.currency || 'EUR'
  const monthlyAmount = ((client.plan_price_cents || 3000) / 100).toFixed(2)

  const handleSyncStripe = useCallback(async (isAuto = false) => {
    setSyncing(true)
    setError('')
    setSyncMessage(isAuto ? 'Syncing completed checkout with Stripe…' : 'Checking Stripe for latest payment…')
    try {
      const res = await fetch('/api/stripe/sync-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id }),
      })
      const data = await res.json()
      if (data.synced) {
        setSyncMessage('✅ Successfully synced with Stripe! Status updated to Paid & Active.')
        router.refresh()
      } else {
        setSyncMessage(data.message || 'No active payment found in Stripe for this client.')
      }
    } catch {
      setError('Network error while syncing with Stripe')
    } finally {
      setSyncing(false)
    }
  }, [client.id, router])

  // Auto-sync if redirected from successful checkout
  useEffect(() => {
    if (searchParams.get('checkout') === 'success' && !isPaid) {
      handleSyncStripe(true)
    }
  }, [searchParams, isPaid, handleSyncStripe])

  async function generatePaymentLink() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          email: client.email,
          business_name: client.business_name,
          plan_price_cents: client.plan_price_cents || 3000,
          setup_fee_cents: client.setup_fee_cents || 0,
          currency: client.currency || 'EUR',
          org_id: client.org_id,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error || 'Failed to create payment link')
      } else {
        setCheckoutUrl(data.url)
      }
    } catch {
      setError('Network error while creating payment link')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink(urlToCopy: string) {
    await navigator.clipboard.writeText(urlToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // Pre-filled WhatsApp message
  const waMessage = encodeURIComponent(
    `Hello ${client.contact_name || client.business_name},\n\nHere is your secure payment checkout link for ${client.business_name} (${monthlyAmount} ${currency}/month):\n${checkoutUrl}\n\nPlease complete the payment to activate your service.`
  )
  const waUrl = client.phone ? `https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text=${waMessage}` : `https://wa.me/?text=${waMessage}`

  // Pre-filled Email message
  const mailSubject = encodeURIComponent(`Payment Link for ${client.business_name}`)
  const mailBody = encodeURIComponent(
    `Hello ${client.contact_name || client.business_name},\n\nPlease use this secure Stripe checkout link to complete your payment and activate your subscription:\n\n${checkoutUrl}\n\nAmount: ${monthlyAmount} ${currency}/mo\n\nThank you!`
  )
  const mailtoUrl = `mailto:${client.email}?subject=${mailSubject}&body=${mailBody}`

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      marginTop: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            💳 Client Payment & Stripe Link
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 99,
              background: isPaid ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
              color: isPaid ? '#22C55E' : '#F59E0B',
            }}>
              {isPaid ? '✓ Paid & Active' : '⏳ Payment Pending'}
            </span>
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            {isPaid
              ? 'This client is actively subscribed and billing is automatically managed by Stripe.'
              : 'Client has not completed payment yet. Generate and send them a secure Stripe checkout link.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Sync Button */}
          <button
            onClick={() => handleSyncStripe(false)}
            disabled={syncing}
            className="btn btn-secondary btn-sm"
            style={{ gap: 6 }}
            title="Sync latest payment status directly from Stripe API"
          >
            <RefreshCw size={14} className={syncing ? 'spinner' : ''} />
            {syncing ? 'Syncing…' : 'Sync from Stripe'}
          </button>

          {!isPaid && !checkoutUrl && (
            <button
              onClick={generatePaymentLink}
              disabled={loading}
              className="btn btn-primary btn-sm"
              style={{ gap: 8 }}
            >
              {loading ? <Loader2 size={16} className="spinner" /> : <LinkIcon size={16} />}
              {loading ? 'Creating Link…' : 'Generate Payment Link'}
            </button>
          )}
        </div>
      </div>

      {syncMessage && (
        <div style={{
          background: syncMessage.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'var(--color-surface-2)',
          border: `1px solid ${syncMessage.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'var(--color-border)'}`,
          color: syncMessage.startsWith('✅') ? '#22C55E' : 'var(--color-text)',
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: '0.85rem',
        }}>
          {syncMessage}
        </div>
      )}

      {error && (
        <div style={{ background: 'var(--color-danger-dim)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* When Checkout URL is Generated */}
      {checkoutUrl && (
        <div style={{
          background: 'var(--color-surface-2)',
          border: '1px solid rgba(232, 68, 10, 0.3)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary-light)' }}>
            ⚡ Stripe Checkout Link Ready for {client.business_name}:
          </div>

          <div style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '10px 14px',
            fontFamily: 'monospace',
            fontSize: '0.82rem',
            color: 'var(--color-text)',
            wordBreak: 'break-all',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <span>{checkoutUrl}</span>
            <button
              onClick={() => copyLink(checkoutUrl)}
              className="btn btn-sm"
              style={{
                background: copied ? '#22C55E' : 'var(--color-primary)',
                color: '#fff',
                flexShrink: 0,
                padding: '6px 12px',
                gap: 6,
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          {/* Quick share actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ gap: 6, background: 'var(--color-success-dim)', color: 'var(--color-success)', borderColor: 'rgba(22, 163, 74, 0.3)' }}
            >
              <MessageCircle size={14} /> Send via WhatsApp
            </a>

            <a
              href={mailtoUrl}
              className="btn btn-secondary btn-sm"
              style={{ gap: 6, background: 'var(--color-info-dim)', color: 'var(--color-info)', borderColor: 'rgba(37, 99, 235, 0.3)' }}
            >
              <Mail size={14} /> Send via Email
            </a>

            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ gap: 6 }}
            >
              <ExternalLink size={14} /> Open Checkout ↗
            </a>
          </div>
        </div>
      )}

      {/* Stripe subscription IDs if available */}
      {isPaid && client.stripe_subscription_id && (
        <div style={{ display: 'flex', gap: 24, fontSize: '0.85rem', color: 'var(--color-text-muted)', flexWrap: 'wrap', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 12 }}>
          <div>
            <strong>Subscription ID:</strong> <span style={{ fontFamily: 'monospace', color: '#22C55E' }}>{client.stripe_subscription_id}</span>
          </div>
          {client.stripe_customer_id && (
            <div>
              <strong>Customer ID:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--color-text)' }}>{client.stripe_customer_id}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
