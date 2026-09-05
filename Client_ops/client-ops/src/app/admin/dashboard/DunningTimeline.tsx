'use client'

import { useState } from 'react'
import { Clock, Mail, PauseCircle, XCircle, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import SendReminderModal from '@/components/SendReminderModal'

interface DunningClient {
  id: string
  business_name: string
  email: string
  contact_name: string | null
  plan_price_cents: number | null
  currency: string | null
  status: string
  // most recent payment_failed activity timestamp
  failed_at: string
}

interface Props {
  clients: DunningClient[]
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function DunningStage({ days }: { days: number }) {
  if (days >= 30) return { label: 'Day 30 — Cancel', color: 'var(--color-text-muted)', icon: XCircle, urgent: false, action: 'cancel' }
  if (days >= 14) return { label: 'Day 14 — Pause Site', color: 'var(--color-danger)', icon: PauseCircle, urgent: true, action: 'pause' }
  if (days >= 10) return { label: 'Day 10 — 2nd Reminder', color: 'var(--color-warning)', icon: Mail, urgent: true, action: 'remind_2' }
  if (days >= 1)  return { label: 'Day 1 — 1st Reminder', color: 'var(--color-warning)', icon: Mail, urgent: false, action: 'remind_1' }
  return { label: 'Day 0 — Alerted', color: 'var(--color-primary)', icon: CheckCircle2, urgent: false, action: 'none' }
}

export default function DunningTimeline({ clients }: Props) {
  const [openReminder, setOpenReminder] = useState<DunningClient | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionDone, setActionDone] = useState<Set<string>>(new Set())

  if (clients.length === 0) return null

  async function handlePause(client: DunningClient) {
    setActionLoading(client.id)
    try {
      const res = await fetch('/api/admin/pause-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, reason: 'Day 14 Dunning Policy: Non-Payment Site Pause' }),
      })
      if (res.ok) {
        setActionDone(prev => new Set(Array.from(prev).concat(`${client.id}_pause`)))
        window.location.reload()
      }
    } catch { /* noop */ }
    setActionLoading(null)
  }

  return (
    <div className="card" style={{ padding: 0, border: '1px solid rgba(239,68,68,0.25)' }}>
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Clock size={16} style={{ color: 'var(--color-danger)' }} />
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>⏱️ Dunning Timeline</h2>
        <span style={{
          marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600,
          background: 'var(--color-danger-dim)', color: 'var(--color-danger)',
          padding: '2px 10px', borderRadius: 99,
        }}>
          {clients.length} client{clients.length > 1 ? 's' : ''} past due
        </span>
      </div>

      <div style={{ padding: '8px 0' }}>
        {clients.map(client => {
          const days = daysSince(client.failed_at)
          const stage = DunningStage({ days })
          const Icon = stage.icon

          return (
            <div key={client.id} style={{
              padding: '14px 24px',
              borderBottom: '1px solid var(--color-border-subtle)',
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: 16,
              alignItems: 'center',
            }}>
              {/* Client info + stage indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Timeline track */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  {[0, 1, 3, 7, 10, 14, 30].map((d, i) => (
                    <div key={d} style={{
                      width: 6, height: i === 0 ? 6 : 4, borderRadius: '50%',
                      background: days >= d ? stage.color : 'var(--color-border)',
                      transition: 'background 0.2s',
                    }} />
                  ))}
                </div>

                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{client.business_name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {client.email}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                    <Icon size={13} style={{ color: stage.color }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: stage.color }}>
                      {stage.label} · Day {days} now
                    </span>
                    {stage.urgent && (
                      <span style={{
                        fontSize: '0.65rem', background: 'var(--color-danger-dim)',
                        color: 'var(--color-danger)', padding: '1px 6px', borderRadius: 4, fontWeight: 700,
                      }}>
                        ACTION REQUIRED
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Days counter badge */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '1.4rem', fontWeight: 800, color: stage.urgent ? 'var(--color-danger)' : 'var(--color-text-muted)',
                  lineHeight: 1,
                }}>
                  {days}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  days
                </div>
              </div>

              {/* Action button */}
              <div style={{ display: 'flex', gap: 8 }}>
                {(stage.action === 'remind_1' || stage.action === 'remind_2') && (
                  <button
                    id={`dunning-reminder-${client.id}`}
                    className="btn btn-danger btn-sm"
                    onClick={() => setOpenReminder(client)}
                    style={{ gap: 6 }}
                  >
                    <Mail size={13} />
                    {stage.action === 'remind_2' ? 'Send 2nd Reminder' : 'Send Reminder'}
                  </button>
                )}

                {stage.action === 'pause' && !actionDone.has(`${client.id}_pause`) && (
                  <button
                    id={`dunning-pause-${client.id}`}
                    className="btn btn-danger btn-sm"
                    onClick={() => handlePause(client)}
                    disabled={actionLoading === client.id}
                    style={{ gap: 6 }}
                  >
                    {actionLoading === client.id
                      ? <Loader2 size={13} className="spin" />
                      : <PauseCircle size={13} />}
                    Pause Site Now
                  </button>
                )}

                {stage.action === 'cancel' && (
                  <a
                    href={`/admin/clients/${client.id}`}
                    id={`dunning-cancel-${client.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: 6 }}
                  >
                    <ChevronRight size={13} />
                    Record Churn
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Reminder Modal */}
      {openReminder && (
        <SendReminderModal
          clientId={openReminder.id}
          clientName={openReminder.business_name}
          contactName={openReminder.contact_name}
          clientEmail={openReminder.email}
          amountCents={openReminder.plan_price_cents ?? undefined}
          currency={openReminder.currency ?? 'EUR'}
          onClose={() => setOpenReminder(null)}
        />
      )}
    </div>
  )
}
