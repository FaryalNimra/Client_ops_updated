'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import styles from './auth.module.css'
import ThemeToggle from '@/components/ThemeToggle'

function AuthForm() {
  const searchParams = useSearchParams()
  const roleParam = searchParams.get('role')

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPass, setShowPass] = useState(false)



  const getRoleHeader = () => {
    if (roleParam === 'super_admin') {
      return {
        badge: '🛡️ Super Admin Portal',
        badgeClass: 'super',
        desc: 'Sign in to access platform-wide organization & admin management',
        placeholder: 'superadmin@example.com'
      }
    }
    if (roleParam === 'admin') {
      return {
        badge: '🏢 Organization Admin Portal',
        badgeClass: 'admin',
        desc: 'Sign in to manage your clients, invoices, and service requests',
        placeholder: 'admin@agency.com'
      }
    }
    if (roleParam === 'client') {
      return {
        badge: '👤 Client & Customer Portal',
        badgeClass: 'client',
        desc: 'Sign in to view project requests, tasks, and invoice history',
        placeholder: 'client@company.com'
      }
    }
    return {
      badge: '⚡ Unified Access Portal',
      badgeClass: 'default',
      desc: 'Sign in with your registered email and password',
      placeholder: 'user@example.com'
    }
  }

  const roleInfo = getRoleHeader()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Role-based smart routing: directly send user to their portal
    if (authData?.user) {
      const user = authData.user
      const userRole = user.user_metadata?.role || user.app_metadata?.role || roleParam
      const metaSlug = user.user_metadata?.org_slug || user.app_metadata?.org_slug

      if (userRole === 'super_admin') {
        window.location.href = '/super-admin'
        return
      }
      
      if (userRole === 'client') {
        window.location.href = '/client/dashboard'
        return
      }

      // If org_slug is available directly in token metadata, redirect instantly
      if (metaSlug) {
        window.location.href = `/org/${metaSlug}/dashboard`
        return
      }

      // Otherwise, quick lookup with Promise.race timeout
      try {
        const profilePromise = supabase
          .from('profiles')
          .select('role, org_id')
          .eq('id', user.id)
          .maybeSingle()

        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ data: null }), 1200))
        const res: any = await Promise.race([profilePromise, timeoutPromise])
        const profile = res?.data

        if (profile?.org_id) {
          const orgPromise = supabase
            .from('organizations')
            .select('slug')
            .eq('id', profile.org_id)
            .maybeSingle()

          const orgTimeout = new Promise((resolve) => setTimeout(() => resolve({ data: null }), 1200))
          const orgRes: any = await Promise.race([orgPromise, orgTimeout])
          const org = orgRes?.data
          if (org?.slug) {
            window.location.href = `/org/${org.slug}/dashboard`
            return
          }
        }
      } catch (err) {
        console.error('Profile route lookup error:', err)
      }

      window.location.href = '/admin/dashboard'
      return
    }

    // Fallback if roleParam is known
    if (roleParam === 'super_admin') {
      window.location.href = '/super-admin'
    } else if (roleParam === 'client') {
      window.location.href = '/client/dashboard'
    } else {
      window.location.href = '/admin/dashboard'
    }
  }

  return (
    <div className={styles.container}>
      {/* Background grid */}
      <div className={styles.grid} aria-hidden="true" />

      {/* Glow orb */}
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.card}>
        {/* Top Back Nav & Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: -10 }}>
          <Link 
            href="/"
            style={{ 
              fontSize: '0.82rem', 
              color: 'var(--color-text-muted)', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 6,
              textDecoration: 'none'
            }}
          >
            ← Back to Home
          </Link>
          <ThemeToggle size="sm" />
        </div>

        <div className={styles.logo}>
          <div className={styles.logoMark}>C</div>
          <div>
            <div className={styles.logoName}>Client Ops</div>
            <div className={styles.logoSub}>Operations Portal</div>
          </div>
        </div>

        <div className={styles.heading}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '2px 8px',
              borderRadius: 4,
              background: roleParam === 'super_admin' ? 'rgba(232, 68, 10, 0.18)' : roleParam === 'admin' ? 'rgba(59, 130, 246, 0.18)' : 'var(--color-surface-2)',
              color: roleParam === 'super_admin' ? '#FF7A45' : roleParam === 'admin' ? 'var(--color-info)' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}>
              {roleInfo.badge}
            </span>
          </div>
          <h1 className={styles.title}>Sign in</h1>
          <p className={styles.subtitle}>{roleInfo.desc}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} id="auth-form">
          {/* Email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder={roleInfo.placeholder}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.errorBox} id="auth-error">
              {error}
            </div>
          )}

          <button
            id="submit-login"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16 }} />
                Signing in…
              </>
            ) : (
              'Sign in →'
            )}
          </button>
        </form>

        <p className={styles.footer}>
          ClientOps Multi-Tenant Secure Access Control.
        </p>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    }>
      <AuthForm />
    </Suspense>
  )
}
