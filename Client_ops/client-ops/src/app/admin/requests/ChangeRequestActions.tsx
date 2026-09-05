'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NEXT_STATUSES: Record<string, string[]> = {
  new:                ['in_progress', 'needs_client_input', 'done', 'rejected'],
  in_progress:        ['needs_client_input', 'done', 'rejected'],
  needs_client_input: ['in_progress', 'done', 'rejected'],
  done:               [],
  rejected:           [],
}

export default function ChangeRequestActions({
  requestId,
  currentStatus,
}: {
  requestId: string
  currentStatus: string
}) {
  const [loading, setLoading] = useState(false)
  const [note, setNote]       = useState('')
  const router = useRouter()

  const nextStatuses = NEXT_STATUSES[currentStatus] ?? []

  async function updateStatus(newStatus: string) {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('change_requests') as any)
      .update({
        status:       newStatus,
        admin_note:   note || null,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', requestId)

    router.refresh()
    setLoading(false)
  }

  if (nextStatuses.length === 0) return null

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        className="form-input"
        style={{ flex: 1, minWidth: 180, fontSize: '0.8rem', padding: '6px 10px' }}
        placeholder="Admin note (optional)…"
        value={note}
        onChange={e => setNote(e.target.value)}
      />
      {nextStatuses.map(s => (
        <button
          key={s}
          id={`set-status-${requestId}-${s}`}
          className={`btn btn-sm ${s === 'done' ? 'btn-primary' : s === 'rejected' ? 'btn-danger' : 'btn-secondary'}`}
          disabled={loading}
          onClick={() => updateStatus(s)}
          style={{ textTransform: 'capitalize' }}
        >
          → {s.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  )
}
