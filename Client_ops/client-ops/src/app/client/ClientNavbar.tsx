'use client'

import { supabase } from '@/lib/supabase/client'
import { LogOut, ShieldCheck } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

interface ClientNavbarProps {
  email: string
  name: string
  businessName: string
}

export default function ClientNavbar({ email, name, businessName }: ClientNavbarProps) {

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header style={{
      height: 64,
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 34,
          height: 34,
          background: 'var(--color-primary)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1.1rem',
          color: '#fff',
        }}>
          C
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {businessName}
            <span className="badge badge-active" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
              <ShieldCheck size={12} /> Client Hub
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Client Operations Portal</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>{name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{email}</div>
        </div>
        <ThemeToggle size="sm" />
        <button
          id="client-sign-out-btn"
          onClick={handleSignOut}
          className="btn btn-ghost btn-sm"
          style={{ gap: 6 }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </header>
  )
}
