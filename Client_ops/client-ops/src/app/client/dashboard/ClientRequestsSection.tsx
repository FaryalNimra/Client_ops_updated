'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquarePlus, Send, Loader2, CheckCircle2, Clock, AlertCircle, HelpCircle } from 'lucide-react'
import type { Database } from '@/types/database'

type RequestRecord = Database['public']['Tables']['change_requests']['Row']

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'new':
      return <span className="badge badge-lead"><Clock size={12} /> New</span>
    case 'in_progress':
      return <span className="badge badge-active"><Loader2 size={12} className="spin" /> In Progress</span>
    case 'needs_client_input':
      return <span className="badge badge-warning"><HelpCircle size={12} /> Needs Input</span>
    case 'done':
      return <span className="badge badge-success"><CheckCircle2 size={12} /> Completed</span>
    case 'rejected':
      return <span className="badge badge-danger"><AlertCircle size={12} /> Rejected</span>
    default:
      return <span className="badge">{status}</span>
  }
}

interface Props {
  initialRequests: RequestRecord[]
  clientId: string
  currentBillingMonth: string
}

export default function ClientRequestsSection({ initialRequests, currentBillingMonth }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [type, setType] = useState('copy_edit')
  const [targetPage, setTargetPage] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Calculate used quota for current billing month
  const currentMonthRequests = initialRequests.filter(r => r.billing_month === currentBillingMonth)
  const usedQuota = currentMonthRequests.length
  const quotaLimit = 2
  const remainingQuota = Math.max(0, quotaLimit - usedQuota)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/client/create-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          targetPage,
          description,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to submit request')
        setLoading(false)
        return
      }

      setLoading(false)
      setShowModal(false)
      setDescription('')
      setTargetPage('')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error')
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
              🛠️ Website Maintenance & Change Requests
            </h2>
            <span
              className={`badge ${usedQuota >= quotaLimit ? 'badge-warning' : 'badge-active'}`}
              style={{ fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px' }}
            >
              Monthly Quota: {usedQuota} / {quotaLimit} Used ({currentBillingMonth})
            </span>
          </div>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
            Includes up to 2 small site edits per billing month (text changes, image swaps, contact detail updates).
          </p>
        </div>

        <button
          id="open-change-request-modal-btn"
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
          disabled={usedQuota >= quotaLimit}
          style={{ gap: 8 }}
        >
          <MessageSquarePlus size={16} />
          Submit New Request
        </button>
      </div>

      {/* Quota Exceeded Banner */}
      {usedQuota >= quotaLimit && (
        <div style={{
          background: 'rgba(234, 179, 8, 0.1)',
          borderBottom: '1px solid rgba(234, 179, 8, 0.2)',
          padding: '12px 24px',
          fontSize: '0.83rem',
          color: 'var(--color-warning)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <AlertCircle size={16} />
          <span>
            You have reached your 2 monthly maintenance requests quota for <strong>{currentBillingMonth}</strong>. Additional edits require a custom one-off quote.
          </span>
        </div>
      )}

      {/* Requests Table */}
      <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
        {initialRequests && initialRequests.length > 0 ? (
          <table className="table" id="client-change-requests-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Target Page</th>
                <th>Description</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Admin Notes</th>
              </tr>
            </thead>
            <tbody>
              {initialRequests.map((req) => (
                <tr key={req.id}>
                  <td>
                    <span className="badge badge-lead" style={{ textTransform: 'capitalize' }}>
                      {req.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                    {req.target_page || 'Entire Site'}
                  </td>
                  <td style={{ maxWidth: 280, fontSize: '0.85rem' }}>
                    {req.description}
                  </td>
                  <td>
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {new Date(req.requested_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </td>
                  <td style={{ fontSize: '0.83rem', color: req.admin_note ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                    {req.admin_note || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state" style={{ padding: '40px 24px' }}>
            <p className="text-muted">No change requests submitted yet.</p>
          </div>
        )}
      </div>

      {/* ── Submit Request Modal ───────────────────────────── */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          <div className="card animate-in" style={{ maxWidth: 540, width: '100%', padding: 28, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Submit Change Request</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowModal(false)}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <p className="text-muted" style={{ fontSize: '0.83rem', marginBottom: 20 }}>
              Remaining quota for <strong>{currentBillingMonth}</strong>: <strong style={{ color: 'var(--color-primary)' }}>{remainingQuota} request(s)</strong>.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label" htmlFor="request-type-select">Request Type</label>
                <select
                  id="request-type-select"
                  className="input"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                >
                  <option value="copy_edit">Text / Copy Edit</option>
                  <option value="image_swap">Image Swap</option>
                  <option value="contact_info">Contact Details / Hours Update</option>
                  <option value="link_fix">Link / Button Fix</option>
                  <option value="other">Other Minor Maintenance Edit</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="request-target-page">Target Page / URL</label>
                <input
                  id="request-target-page"
                  type="text"
                  className="input"
                  placeholder="e.g. /contact or Homepage"
                  value={targetPage}
                  onChange={(e) => setTargetPage(e.target.value)}
                />
              </div>

              <div>
                <label className="label" htmlFor="request-description">Detailed Description</label>
                <textarea
                  id="request-description"
                  className="input"
                  rows={4}
                  placeholder="Describe the exact changes needed clearly..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  id="submit-change-request-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ gap: 8 }}
                >
                  {loading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
