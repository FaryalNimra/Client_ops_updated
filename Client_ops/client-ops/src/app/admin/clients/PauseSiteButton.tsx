'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PauseCircle, AlertTriangle, Loader2 } from 'lucide-react'

interface Props {
  clientId: string
  clientName: string
  currentStatus: string
}

export default function PauseSiteButton({ clientId, clientName, currentStatus }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('Day 14 Non-Payment Automated Dunning Protocol')
  const [error, setError] = useState('')

  if (currentStatus === 'paused') {
    return (
      <span className="badge badge-paused" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
        ⏸️ Site Paused
      </span>
    )
  }

  async function handlePauseSite() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/pause-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, reason }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to pause client site')
        setLoading(false)
        return
      }

      setLoading(false)
      setShowModal(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        id={`pause-site-btn-${clientId}`}
        className="btn btn-danger"
        onClick={() => setShowModal(true)}
        style={{ gap: 6 }}
      >
        <PauseCircle size={16} />
        Pause Site
      </button>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(4px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          <div className="card animate-in" style={{ maxWidth: 520, width: '100%', padding: 28, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-danger-dim)',
                color: 'var(--color-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Pause Client Site?</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Target: {clientName}</div>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', lineHeight: '1.5', color: 'var(--color-text-muted)', marginBottom: 20 }}>
              This action will update <strong>{clientName}</strong> status to <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>paused</span>, trigger hosting deployment protection / Cloudflare redirect rule, and log the action in the audit stream.
            </p>

            <div style={{ marginBottom: 20 }}>
              <label className="label" htmlFor="pause-reason-input">Pause Rationale / Note</label>
              <input
                id="pause-reason-input"
                type="text"
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Day 14 Non-Payment Automated Dunning Protocol"
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
                marginBottom: 16,
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                id="confirm-pause-site-btn"
                type="button"
                className="btn btn-danger"
                onClick={handlePauseSite}
                disabled={loading}
                style={{ gap: 8 }}
              >
                {loading ? <Loader2 size={16} className="spin" /> : <PauseCircle size={16} />}
                Confirm & Pause Site Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
