'use client'

import React from 'react'
import ThemeToggle from '@/components/ThemeToggle'
import { Building2, ShieldCheck } from 'lucide-react'

interface AdminTopbarProps {
  role?: 'admin' | 'super_admin'
  orgName?: string
  orgSlug?: string
  userEmail?: string
}

export default function AdminTopbar({
  role = 'admin',
  orgName,
  orgSlug,
  userEmail,
}: AdminTopbarProps) {
  return (
    <header
      id="admin-topbar"
      style={{
        height: '60px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
      }}
    >
      {/* Left side: Workspace Organization details */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--color-text)',
          }}
        >
          <Building2 size={14} style={{ color: 'var(--color-primary)' }} />
          <span>{orgName || 'Workspace'}</span>
          {orgSlug && (
            <span style={{ fontSize: '0.72rem', opacity: 0.5, fontFamily: 'monospace', fontWeight: 500 }}>
              /{orgSlug}
            </span>
          )}
        </div>
      </div>

      {/* Right side: Role badge, User email, and Top Theme Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {role === 'super_admin' ? (
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              background: 'var(--color-primary-dim)',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-primary-dim)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <ShieldCheck size={13} />
            Super Admin
          </span>
        ) : (
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            Org Admin
          </span>
        )}

        {userEmail && (
          <span
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={userEmail}
          >
            {userEmail}
          </span>
        )}

        {/* ── Top Light / Dark Mode Toggle ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 8,
            borderLeft: '1px solid var(--color-border)',
          }}
        >
          <ThemeToggle size="md" />
        </div>
      </div>
    </header>
  )
}
