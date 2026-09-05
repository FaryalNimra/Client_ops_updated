'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  LogOut,
  AlertCircle,
  Building2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
}

interface SidebarProps {
  role: 'admin' | 'super_admin'
  orgName?: string
  orgSlug?: string
  failedCount?: number
  openRequestsCount?: number
}

export default function Sidebar({
  role,
  orgName,
  orgSlug,
  failedCount = 0,
  openRequestsCount = 0,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const basePrefix = orgSlug ? `/org/${orgSlug}` : '/admin'

  const adminNav: NavItem[] = [
    {
      label: 'Dashboard',
      href: `${basePrefix}/dashboard`,
      icon: <LayoutDashboard className="nav-item-icon" />,
    },
    {
      label: 'Clients',
      href: `${basePrefix}/clients`,
      icon: <Users className="nav-item-icon" />,
    },
    {
      label: 'Invoices',
      href: `${basePrefix}/invoices`,
      icon: <FileText className="nav-item-icon" />,
    },
    {
      label: 'Requests',
      href: `${basePrefix}/requests`,
      icon: <MessageSquare className="nav-item-icon" />,
      badge: openRequestsCount > 0 ? openRequestsCount : undefined,
    },
    {
      label: 'Onboard',
      href: `${basePrefix}/onboard`,
      icon: <AlertCircle className="nav-item-icon" />,
    },
  ]

  const superAdminNav: NavItem[] = [
    {
      label: 'Organizations',
      href: '/super-admin',
      icon: <Building2 className="nav-item-icon" />,
    },
  ]

  return (
    <aside className="sidebar">
      {/* Logo & Workspace Info */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">C</div>
        <div>
          <div className="sidebar-logo-text">Client Ops</div>
          {orgName && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2 }}>
              <div className="sidebar-logo-sub" style={{ fontWeight: 700, color: '#FFFFFF' }}>{orgName}</div>
              {orgSlug && (
                <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--color-primary-light)' }}>
                  /{orgSlug}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" id="sidebar-nav">
        {role === 'super_admin' && (
          <>
            <div className="sidebar-section-label">Super Admin</div>
            {superAdminNav.map(item => (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              >
                {item.icon}
                {item.label}
                {item.badge !== undefined && (
                  <span className="nav-item-badge">{item.badge}</span>
                )}
              </Link>
            ))}
            <div className="divider" />
            <div className="sidebar-section-label">Admin</div>
          </>
        )}

        {adminNav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            {item.icon}
            {item.label}
            {item.badge !== undefined && (
              <span className="nav-item-badge">{item.badge}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {failedCount > 0 && (
          <div
            style={{
              background: 'var(--color-danger-dim)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              color: 'var(--color-danger)',
            }}
          >
            <AlertCircle size={14} />
            {failedCount} failed payment{failedCount > 1 ? 's' : ''}
          </div>
        )}

        <button
          id="sign-out-btn"
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: 'flex-start' }}
          onClick={handleSignOut}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
