'use client'

import React, { useState } from 'react'
import { Key, Check, Copy, Eye, EyeOff, Loader2, RefreshCw, MessageCircle, Mail } from 'lucide-react'

interface ClientPortalAccessProps {
  client: {
    id: string
    business_name: string
    contact_name: string | null
    email: string
    phone: string | null
    org_id: string
  }
}

export default function ClientPortalAccessCard({ client }: ClientPortalAccessProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  function generateRandomPassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$'
    let pass = ''
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(pass)
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long')
      return
    }
    setLoading(true)
    setStatusMessage('')
    setErrorMessage('')

    try {
      const res = await fetch('/api/admin/create-client-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          email: client.email,
          password: password.trim(),
          full_name: client.contact_name || client.business_name,
          org_id: client.org_id,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to update portal password')
      } else {
        setStatusMessage('✅ Client portal account & password saved successfully!')
      }
    } catch {
      setErrorMessage('Network error while updating portal account')
    } finally {
      setLoading(false)
    }
  }

  const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth?role=client` : '/auth?role=client'

  async function copyAllCredentials() {
    const text = `Client Portal Login Details:\n• Portal URL: ${portalUrl}\n• Email: ${client.email}\n• Password: ${password}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const waMessage = encodeURIComponent(
    `Hello ${client.contact_name || client.business_name},\n\nHere are your Client Portal login details:\n• Portal URL: ${portalUrl}\n• Email: ${client.email}\n• Password: ${password}\n\nYou can log in to view your invoices and submit change requests.`
  )
  const waUrl = client.phone ? `https://wa.me/${client.phone.replace(/[^0-9]/g, '')}?text=${waMessage}` : `https://wa.me/?text=${waMessage}`

  const mailSubject = encodeURIComponent(`Your Client Portal Access — ${client.business_name}`)
  const mailBody = encodeURIComponent(
    `Hello ${client.contact_name || client.business_name},\n\nYour Client Portal account is ready.\n\nPortal URL: ${portalUrl}\nEmail: ${client.email}\nPassword: ${password}\n\nPlease log in to access your dashboard, billing invoices, and requests.\n\nBest regards,\nOperations Team`
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
            🔐 Client Portal Access & Password
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            Assign or reset the password for <strong>{client.email}</strong> so the client can log in to the Customer Portal.
          </p>
        </div>
      </div>

      <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: 240 }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Enter client password (min 6 chars)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="button"
            onClick={generateRandomPassword}
            className="btn btn-secondary btn-sm"
            style={{ gap: 6 }}
          >
            <RefreshCw size={14} /> Auto-Generate
          </button>

          <button
            type="submit"
            disabled={loading || !password}
            className="btn btn-primary btn-sm"
            style={{ gap: 6 }}
          >
            {loading ? <Loader2 size={14} className="spinner" /> : <Key size={14} />}
            {loading ? 'Saving…' : 'Save / Set Password'}
          </button>
        </div>
      </form>

      {statusMessage && (
        <div style={{
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
          color: '#22C55E',
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: '0.85rem',
        }}>
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{
          background: 'var(--color-danger-dim)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: 'var(--color-danger)',
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: '0.85rem',
        }}>
          {errorMessage}
        </div>
      )}

      {password && (
        <div style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Share login credentials with client:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={copyAllCredentials}
              className="btn btn-secondary btn-sm"
              style={{ gap: 6 }}
            >
              {copied ? <Check size={14} color="#22C55E" /> : <Copy size={14} />}
              {copied ? 'Credentials Copied!' : 'Copy Credentials'}
            </button>

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
          </div>
        </div>
      )}
    </div>
  )
}
