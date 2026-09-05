'use client'

import { useState } from 'react'
import { Mail, Send, Loader2, CheckCircle2 } from 'lucide-react'

interface SendReminderModalProps {
  clientId: string
  clientName: string
  contactName?: string | null
  clientEmail: string
  amountCents?: number | null
  currency?: string
  hostedInvoiceUrl?: string | null
  onClose: () => void
  onSuccess?: () => void
}

function formatCents(cents: number | null | undefined, currency = 'EUR') {
  if (!cents) return '€30.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100)
}

export default function SendReminderModal({
  clientId,
  clientName,
  contactName,
  clientEmail,
  amountCents,
  currency,
  hostedInvoiceUrl,
  onClose,
  onSuccess,
}: SendReminderModalProps) {
  const formattedAmount = formatCents(amountCents, currency || 'EUR')
  const defaultSubject = `Payment Reminder: Care Plan Subscription for ${clientName}`
  const defaultBody = `Hi ${contactName || 'there'},

We noticed that your latest monthly care plan payment of ${formattedAmount} for ${clientName} was unsuccessful.

To keep your website online and maintain your care plan coverage, please update your payment method or complete the invoice using the secure link below:

${hostedInvoiceUrl ? hostedInvoiceUrl : '[Link to Stripe Hosted Invoice]'}

If you have any questions or need assistance, please reply directly to this email.

Best regards,
Agency Operations Team`

  const [subject, setSubject] = useState(defaultSubject)
  const [bodyText, setBodyText] = useState(defaultBody)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientEmail,
          subject,
          bodyText,
          invoiceUrl: hostedInvoiceUrl,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to send reminder')
        setLoading(false)
        return
      }

      setLoading(false)
      setSent(true)
      setTimeout(() => {
        if (onSuccess) onSuccess()
        onClose()
      }, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error')
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(4px)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div className="card animate-in" style={{ maxWidth: 580, width: '100%', padding: 28, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-danger-dim)',
              color: 'var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Mail size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Send Payment Reminder</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>To: {clientEmail} ({clientName})</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <CheckCircle2 size={42} style={{ color: 'var(--color-success)', marginBottom: 12, margin: '0 auto' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>Payment Reminder Sent!</h4>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>The dunning reminder email was sent to {clientEmail} and logged to the audit trail.</p>
          </div>
        ) : (
          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label" htmlFor="reminder-subject">Subject</label>
              <input
                id="reminder-subject"
                type="text"
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="reminder-body">Email Body (Pre-filled Dunning Template)</label>
              <textarea
                id="reminder-body"
                className="input"
                rows={8}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                required
                style={{ fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: '1.45' }}
              />
            </div>

            {error && (
              <div style={{
                color: 'var(--color-danger)',
                background: 'var(--color-danger-dim)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: '0.82rem',
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button
                id="confirm-send-reminder-btn"
                type="submit"
                className="btn btn-danger"
                disabled={loading}
                style={{ gap: 8 }}
              >
                {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                Send Payment Reminder
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
