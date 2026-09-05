'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, Loader2, AlertTriangle } from 'lucide-react'

interface Props {
  clientId: string
  clientName: string
  currentStatus: string
}

const CHURN_REASONS = [
  'Too expensive',
  'No longer needs the service',
  'Found a cheaper alternative',
  'Business closed',
  'Unhappy with service quality',
  'Switching to DIY / in-house',
  'Non-payment / forced churn',
  'Other',
]

export default function ChurnClientButton({ clientId, clientName, currentStatus }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [churnReason, setChurnReason] = useState('')
  const [churnNote, setChurnNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Already churned — show static badge
  if (currentStatus === 'churned') {
    return (
      <span className="badge badge-churned" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
        ✗ Churned
      </span>
    )
  }

  async function handleChurn() {
    if (!churnReason) { setError('Please select a churn reason'); return }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/record-churn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, churnReason, churnNote }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to record churn'); setLoading(false); return }
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
        id={`churn-client-btn-${clientId}`}
        className="btn btn-secondary btn-sm"
        onClick={() => setShowModal(true)}
        style={{ gap: 6 }}
      >
        <XCircle size={14} />
        Record Churn
      </button>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div className="card animate-in" style={{ maxWidth: 500, width: '100%', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 'var(--radius-md)',
                background: 'rgba(148,163,184,0.15)', color: 'var(--color-text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Record Client Churn</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{clientName}</div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 20, lineHeight: '1.5' }}>
              This will set the client status to <strong>churned</strong> and record the reason. The offboarding checklist will activate on their profile. This action is logged.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label" htmlFor="churn-reason-select">
                  Churn Reason <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select
                  id="churn-reason-select"
                  className="input"
                  value={churnReason}
                  onChange={e => setChurnReason(e.target.value)}
                >
                  <option value="">— Select reason —</option>
                  {CHURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="churn-note-input">Additional Notes (optional)</label>
                <textarea
                  id="churn-note-input"
                  className="input"
                  rows={3}
                  value={churnNote}
                  onChange={e => setChurnNote(e.target.value)}
                  placeholder="Any context about this cancellation..."
                  style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem' }}
                />
              </div>

              {error && (
                <div style={{
                  color: 'var(--color-danger)', background: 'var(--color-danger-dim)',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)',
                  padding: '8px 14px', fontSize: '0.82rem',
                }}>
                  ⚠️ {error}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={loading}>
                Cancel
              </button>
              <button
                id="confirm-churn-btn"
                type="button"
                className="btn btn-secondary"
                onClick={handleChurn}
                disabled={loading || !churnReason}
                style={{ gap: 8, opacity: !churnReason ? 0.5 : 1 }}
              >
                {loading ? <Loader2 size={15} className="spin" /> : <XCircle size={15} />}
                Confirm Churn
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
