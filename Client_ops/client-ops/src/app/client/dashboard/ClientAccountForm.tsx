'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Phone, Save, Loader2, CheckCircle2 } from 'lucide-react'

interface Props {
  initialContactName: string | null
  initialEmail: string
  initialPhone: string | null
}

export default function ClientAccountForm({
  initialContactName,
  initialEmail,
  initialPhone,
}: Props) {
  const router = useRouter()
  const [contactName, setContactName] = useState(initialContactName || '')
  const [email, setEmail] = useState(initialEmail || '')
  const [phone, setPhone] = useState(initialPhone || '')
  const [loading, setLoading] = useState(false)
  const [successToast, setSuccessToast] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessToast(false)

    try {
      const res = await fetch('/api/client/update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: contactName,
          email,
          phone,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to update contact details')
        setLoading(false)
        return
      }

      setLoading(false)
      setSuccessToast(true)
      router.refresh()

      setTimeout(() => {
        setSuccessToast(false)
      }, 3500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error')
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
            👤 Account Details & Primary Contact
          </h2>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
            Update your primary contact person, email address, and phone number.
          </p>
        </div>

        {successToast && (
          <div style={{
            background: 'var(--color-success-dim)',
            color: 'var(--color-success)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 14px',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease-in-out',
          }}>
            <CheckCircle2 size={16} />
            Contact details saved successfully!
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div>
          <label className="label" htmlFor="contact-name-input">
            <User size={13} style={{ display: 'inline', marginRight: 6 }} />
            Contact Name
          </label>
          <input
            id="contact-name-input"
            type="text"
            className="input"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="e.g. Sarah Jenkins"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="label" htmlFor="contact-email-input">
            <Mail size={13} style={{ display: 'inline', marginRight: 6 }} />
            Email Address
          </label>
          <input
            id="contact-email-input"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="billing@acme.com"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="label" htmlFor="contact-phone-input">
            <Phone size={13} style={{ display: 'inline', marginRight: 6 }} />
            Phone Number
          </label>
          <input
            id="contact-phone-input"
            type="tel"
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 019-2834"
            disabled={loading}
          />
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          {error ? (
            <div style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>⚠️ {error}</div>
          ) : <div />}

          <button
            id="save-account-details-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ gap: 8 }}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            Save Account Details
          </button>
        </div>
      </form>
    </div>
  )
}
