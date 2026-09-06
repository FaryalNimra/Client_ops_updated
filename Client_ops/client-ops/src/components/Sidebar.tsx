'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  LogOut,
  AlertCircle,
  Building2,
  UserPlus,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'

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
}: SidebarProps) {
  const pathname = usePathname()

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const basePrefix = orgSlug ? `/org/${orgSlug}` : '/admin'

  const adminNav: NavItem[] = [
    {
      label: 'Dashboard',
      href: `${basePrefix}/dashboard`,
      icon: <LayoutDashboard className="nav-item-icon" size={18} />,
    },
    {
      label: 'Clients',
      href: `${basePrefix}/clients`,
      icon: <Users className="nav-item-icon" size={18} />,
    },
    // {
    //   label: 'Invoices',
    //   href: `${basePrefix}/invoices`,
    //   icon: <FileText className="nav-item-icon" size={18} />,
    // },
    // {
    //   label: 'Requests',
    //   href: `${basePrefix}/requests`,
    //   icon: <Inbox className="nav-item-icon" size={18} />,
    //   badge: openRequestsCount > 0 ? openRequestsCount : undefined,
    // },
    {
      label: 'Onboard',
      href: `${basePrefix}/onboard`,
      icon: <UserPlus className="nav-item-icon" size={18} />,
    },
  ]

  const superAdminNav: NavItem[] = [
    {
      label: 'Organizations',
      href: '/super-admin',
      icon: <Building2 className="nav-item-icon" size={18} />,
    },
  ]

  const showSlug = orgSlug && orgSlug.toLowerCase() !== orgName?.toLowerCase()

  return (
    <aside className="sidebar" id="app-sidebar">
      {/* Premium Logo Header */}
      <div className="sidebar-logo">
        <div 
          style={{
            background: 'linear-gradient(135deg, #FF4500 0%, #FF6B35 100%)',
            color: 'white',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '18px',
            boxShadow: '0 4px 12px rgba(255, 69, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
            flexShrink: 0,
            letterSpacing: '-0.02em',
          }}
        >
          C
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px', minWidth: 0 }}>
          <span className="sidebar-logo-text" style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em', lineHeight: '1' }}>
            Client Ops
          </span>
          {orgName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
              <span className="sidebar-logo-sub" style={{ fontSize: '12px', fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {orgName}
              </span>
              {showSlug && (
                <span style={{ fontSize: '10px', opacity: 0.55, fontFamily: 'monospace', flexShrink: 0 }}>
                  /{orgSlug}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav" id="sidebar-nav">
        {role === 'super_admin' && (
          <>
            <div className="sidebar-section-label">Super Admin</div>
            {superAdminNav.map(item => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )
            })}
            <div className="divider" style={{ margin: '12px 6px', opacity: 0.5 }} />
          </>
        )}

        <div className="sidebar-section-label">Workspace</div>
        {adminNav.map(item => {
          const isActive = item.href.endsWith('/dashboard')
            ? pathname === item.href
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="nav-item-badge">{item.badge}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer / User Actions */}
      <div className="sidebar-footer">
        {failedCount > 0 && (
          <div style={{
            background: 'var(--color-danger-dim)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-danger)',
            fontSize: '13px',
            fontWeight: 600,
            animation: 'pulseAlert 3s infinite',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{failedCount} failed payment{failedCount > 1 ? 's' : ''}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={handleSignOut}
            className="btn btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.85 }}
            id="sidebar-sign-out"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
          <ThemeToggle size="sm" />
        </div>
      </div>
    </aside>
  )
}