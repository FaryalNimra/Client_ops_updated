'use client'

import { useState } from 'react'
import { CheckSquare, Square, Loader2, AlertCircle } from 'lucide-react'

interface Props {
  clientId: string
  clientStatus: string
  initialNotesStr: string | null
}

interface ChecklistState {
  revoke_github: boolean
  remove_domains: boolean
  cancel_google: boolean
  archive_vault: boolean
}

const DEFAULT_STATE: ChecklistState = {
  revoke_github: false,
  remove_domains: false,
  cancel_google: false,
  archive_vault: false,
}

export default function OffboardingChecklist({ clientId, clientStatus, initialNotesStr }: Props) {
  // Parse initial checklist state from notes field if present
  let initialChecklist = DEFAULT_STATE
  try {
    if (initialNotesStr && initialNotesStr.startsWith('{')) {
      const parsed = JSON.parse(initialNotesStr)
      if (parsed.offboarding_checklist) {
        initialChecklist = { ...DEFAULT_STATE, ...parsed.offboarding_checklist }
      }
    }
  } catch {
    initialChecklist = DEFAULT_STATE
  }

  const [state, setState] = useState<ChecklistState>(initialChecklist)
  const [savingTask, setSavingTask] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Only render if client status is 'churned' (PRD Requirement)
  if (clientStatus !== 'churned') {
    return null
  }

  async function toggleTask(taskKey: keyof ChecklistState) {
    const nextState = { ...state, [taskKey]: !state[taskKey] }
    setState(nextState) // Optimistic instant update
    setSavingTask(taskKey)
    setError('')

    try {
      const res = await fetch('/api/admin/update-offboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          offboardingState: nextState,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Failed to save offboarding checklist state')
        // Revert optimistic update on failure
        setState(state)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error')
      setState(state)
    } finally {
      setSavingTask(null)
    }
  }

  const completedCount = Object.values(state).filter(Boolean).length
  const totalCount = 4
  const isAllComplete = completedCount === totalCount

  const tasks: { key: keyof ChecklistState; label: string; desc: string }[] = [
    { key: 'revoke_github', label: 'Revoke GitHub access', desc: 'Remove client collaborators from site repository' },
    { key: 'remove_domains', label: 'Remove deployment domains', desc: 'Detach custom DNS & SSL deployment routes in hosting panel' },
    { key: 'cancel_google', label: 'Cancel Google Workspace', desc: 'Disable client email alias & Search Console access' },
    { key: 'archive_vault', label: 'Archive vault credentials', desc: 'Move 1Password/Bitwarden vault item to Churned Archive' },
  ]

  return (
    <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', padding: 24, marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-danger)' }}>
              🚫 Churned Client Offboarding Protocol
            </h3>
            <span
              className={`badge ${isAllComplete ? 'badge-success' : 'badge-danger'}`}
              style={{ fontSize: '0.78rem', fontWeight: 600 }}
            >
              {completedCount} / {totalCount} Completed
            </span>
          </div>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
            Mandatory teardown tasks required after subscription cancellation.
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          color: 'var(--color-danger)',
          background: 'var(--color-danger-dim)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.82rem',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tasks.map(({ key, label, desc }) => {
          const isDone = state[key]
          const isSaving = savingTask === key

          return (
            <div
              key={key}
              onClick={() => !isSaving && toggleTask(key)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: isDone ? 'rgba(34, 197, 94, 0.05)' : 'var(--color-surface-hover)',
                border: isDone ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid var(--color-border)',
                cursor: isSaving ? 'wait' : 'pointer',
                transition: 'all 0.15s ease-in-out',
              }}
            >
              <div style={{ marginTop: 2, color: isDone ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                {isSaving ? (
                  <Loader2 size={18} className="spin" />
                ) : isDone ? (
                  <CheckSquare size={18} />
                ) : (
                  <Square size={18} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: isDone ? 'var(--color-text-muted)' : 'var(--color-text)',
                  textDecoration: isDone ? 'line-through' : 'none',
                }}>
                  {label}
                </div>
                <div className="text-muted" style={{ fontSize: '0.78rem', marginTop: 2 }}>
                  {desc}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
