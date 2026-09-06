'use client'

import React from 'react'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import styles from './landing.module.css'

interface LandingPageProps {
  user: {
    id: string
    email?: string
  } | null
  profile: {
    role: string
    organization_id?: string | null
    full_name?: string | null
  } | null
}

export default function LandingPageClient({ user, profile }: LandingPageProps) {
  const getDashboardLink = () => {
    if (!profile) return '/auth'
    if (profile.role === 'super_admin') return '/super-admin'
    if (profile.role === 'admin') return '/admin/dashboard'
    return '/client/dashboard'
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Background glow effects */}
      <div className={styles.ambientGrid} aria-hidden="true" />
      <div className={styles.ambientGlowTop} aria-hidden="true" />
      <div className={styles.ambientGlowMiddle} aria-hidden="true" />

      {/* ── Top Navigation Bar ── */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logoGroup}>
            <div className={styles.logoIcon}>C</div>
            <div className={styles.logoText}>
              <span className={styles.brandName}>ClientOps</span>
              <span className={styles.brandBadge}>Enterprise Portal</span>
            </div>
          </Link>

          <div className={styles.navLinks}>
            <a href="#platform-overview" className={styles.navLink}>Platform</a>
            <a href="#roles-access" className={styles.navLink}>Roles & Portals</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
            <a href="#features" className={styles.navLink}>Capabilities</a>
          </div>

          <div className={styles.navActions}>
            <ThemeToggle size="sm" />
            {user ? (
              <Link href={getDashboardLink()} className={styles.primaryBtn} style={{ padding: '10px 18px', fontSize: '0.88rem' }}>
                Go to Dashboard →
              </Link>
            ) : (
              <a href="#roles-access" className={styles.primaryBtn} style={{ padding: '10px 18px', fontSize: '0.88rem' }}>
                Choose Role →
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <header className={styles.heroSection}>
        <div className={styles.pillBadge}>
          <span className={styles.pillDot} />
          <span>Multi-Tenant Operations & Client Portal Engine</span>
        </div>

        <h1 className={styles.heroTitle}>
          Unified Platform for <span className={styles.titleHighlight}>Agencies, Clients</span> & Global Operations
        </h1>

        <p className={styles.heroDesc}>
          Scale your agency with complete organization isolation, automated client billing, 
          real-time service tickets, and distinct role-based access for Super Admins, Admins, and Clients.
        </p>

        <div className={styles.heroCtaGroup}>
          <a href="#roles-access" className={styles.primaryBtn} style={{ padding: '16px 36px', fontSize: '1.05rem' }}>
            <span>Choose Your Role & Sign In</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </header>

      {/* ── Role Selector & Portals Section ── */}
      <section id="roles-access" className={styles.rolesSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionPretitle}>Role-Based Architecture</div>
          <h2 className={styles.sectionTitle}>Choose Your Role & Enter Portal</h2>
          <p className={styles.sectionDesc}>
            ClientOps separates responsibilities cleanly with strictly isolated scopes and permission layers.
          </p>
        </div>

        <div className={styles.rolesGrid}>
          {/* 1. Super Admin Card */}
          <div className={styles.roleCard} id="role-superadmin">
            <div className={`${styles.cardTopAccent} ${styles.superAdminAccent}`} />
            
            <div className={styles.roleHeader}>
              <div className={`${styles.roleIconWrapper} ${styles.roleIconSuper}`}>
                🛡️
              </div>
              <div className={styles.roleMeta}>
                <span className={`${styles.roleBadge} ${styles.badgeSuper}`}>Root Level</span>
                <h3 className={styles.roleName}>Super Admin</h3>
              </div>
            </div>

            <p className={styles.roleSummary}>
              Master platform controller for managing all tenant organizations, provisioning agency admins, 
              and monitoring global MRR analytics.
            </p>

            <ul className={styles.roleFeaturesList}>
              <li className={styles.roleFeatureItem}>
                <span className={`${styles.checkIcon} ${styles.checkSuper}`}>✓</span>
                <span>Create, activate & suspend Tenant Organizations</span>
              </li>
              <li className={styles.roleFeatureItem}>
                <span className={`${styles.checkIcon} ${styles.checkSuper}`}>✓</span>
                <span>Provision Organization Admins & verify credentials</span>
              </li>
              <li className={styles.roleFeatureItem}>
                <span className={`${styles.checkIcon} ${styles.checkSuper}`}>✓</span>
                <span>View platform-wide MRR, client totals & activity telemetry</span>
              </li>
              <li className={styles.roleFeatureItem}>
                <span className={`${styles.checkIcon} ${styles.checkSuper}`}>✓</span>
                <span>Full access to organization deep-dive profiles</span>
              </li>
            </ul>

            <Link href="/auth?role=super_admin" className={`${styles.roleActionBtn} ${styles.btnSuper}`}>
              Login as Super Admin →
            </Link>
          </div>

          {/* 2. Organization Admin Card */}
          <div className={styles.roleCard} id="role-admin">
            <div className={`${styles.cardTopAccent} ${styles.adminAccent}`} />
            
            <div className={styles.roleHeader}>
              <div className={`${styles.roleIconWrapper} ${styles.roleIconAdmin}`}>
                🏢
              </div>
              <div className={styles.roleMeta}>
                <span className={`${styles.roleBadge} ${styles.badgeAdmin}`}>Agency Level</span>
                <h3 className={styles.roleName}>Organization Admin</h3>
              </div>
            </div>

            <p className={styles.roleSummary}>
              Complete operational suite for agency owners. Manage client onboarding, dispatch requests, 
              issue invoices, and track revenue.
            </p>

            <ul className={styles.roleFeaturesList}>
              <li className={styles.roleFeatureItem}>
                <span className={`${styles.checkIcon} ${styles.checkAdmin}`}>✓</span>
                <span>Onboard new clients & invite team stakeholders</span>
              </li>
              <li className={styles.roleFeatureItem}>
                <span className={`${styles.checkIcon} ${styles.checkAdmin}`}>✓</span>
                <span>Create & manage custom Invoices (Paid, Pending, Overdue)</span>
              </li>
              <li className={styles.roleFeatureItem}>
                <span className={`${styles.checkIcon} ${styles.checkAdmin}`}>✓</span>
                <span>Triage and resolve client Service Request tickets</span>
              </li>
              <li className={styles.roleFeatureItem}>
                <span className={`${styles.checkIcon} ${styles.checkAdmin}`}>✓</span>
                <span>Dedicated agency dashboard with monthly revenue metrics</span>
              </li>
            </ul>

            <Link href="/auth?role=admin" className={`${styles.roleActionBtn} ${styles.btnAdmin}`}>
              Login as Admin →
            </Link>
          </div>

          {/* 3. Customer / Client Portal Card */}
          <div className={styles.roleCard} id="role-client">
            <div className={`${styles.cardTopAccent} ${styles.clientAccent}`} />
            
            <div className={styles.roleHeader}>
              <div className={`${styles.roleIconWrapper} ${styles.roleIconClient}`}>
                👤
              </div>
              <div className={styles.roleMeta}>
                <span className={`${styles.roleBadge} ${styles.badgeClient}`}>Client Level</span>
                <h3 className={styles.roleName}>Customer / Client</h3>
              </div>
            </div>

            <p className={styles.roleSummary}>
              Self-service portal for clients to track project progress, submit support & change requests, 
              and review/pay active invoices.
            </p>

            <ul className={styles.roleFeaturesList}>
              <li className={styles.roleFeatureItem}>
                <span className={`${styles.checkIcon} ${styles.checkClient}`}>✓</span>
                <span>Submit new work requests & track real-time resolution status</span>
              </li>
              <li className={styles.roleFeatureItem}>
                <span className={`${styles.checkIcon} ${styles.checkClient}`}>✓</span>
                <span>View & download itemized invoices with payment statuses</span>
              </li>
              <li className={styles.roleFeatureItem}>
                <span className={`${styles.checkIcon} ${styles.checkClient}`}>✓</span>
                <span>Transparent overview of active retainers & services</span>
              </li>
              <li className={styles.roleFeatureItem}>
                <span className={`${styles.checkIcon} ${styles.checkClient}`}>✓</span>
                <span>Seamless communication with assigned agency teams</span>
              </li>
            </ul>

            <Link href="/auth?role=client" className={`${styles.roleActionBtn} ${styles.btnClient}`}>
              Login as Client →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Platform Overview / Core Capabilities ── */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionPretitle}>Core Platform Features</div>
          <h2 className={styles.sectionTitle}>Built for High-Growth Operations</h2>
          <p className={styles.sectionDesc}>
            Everything you need to run smooth client engagements, secure tenant data, and accelerate cash flow.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🔒</div>
            <h4 className={styles.featureTitle}>Strict Multi-Tenancy</h4>
            <p className={styles.featureText}>
              Every organization is completely sandboxed with Supabase Row Level Security (RLS). No data leakage between tenants.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>💳</div>
            <h4 className={styles.featureTitle}>Billing & Invoicing</h4>
            <p className={styles.featureText}>
              Generate one-time or recurring retainer invoices. Track paid, pending, and overdue accounts with instant MRR calculation.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h4 className={styles.featureTitle}>Service Ticketing</h4>
            <p className={styles.featureText}>
              Prioritize, assign, and update client tickets with SLA tracking and transparent timeline updates.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h4 className={styles.featureTitle}>Live Telemetry & KPIs</h4>
            <p className={styles.featureText}>
              Real-time analytics for super admins (global MRR, active orgs) and agency admins (client count, pending dues).
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>👥</div>
            <h4 className={styles.featureTitle}>Client Onboarding</h4>
            <p className={styles.featureText}>
              Effortlessly onboard new clients with custom service tiers, contact profiles, and billing configurations.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h4 className={styles.featureTitle}>High Performance UI</h4>
            <p className={styles.featureText}>
              Crafted with Next.js 14, dark-mode ergonomics, micro-interactions, and instant server action responses.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works / Workflow ── */}
      <section id="how-it-works" className={styles.workflowSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionPretitle}>Operational Lifecycle</div>
          <h2 className={styles.sectionTitle}>How ClientOps Operates</h2>
          <p className={styles.sectionDesc}>
            A seamless three-tier workflow from platform setup to client delivery.
          </p>
        </div>

        <div className={styles.stepsRow}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>01</div>
            <h4 className={styles.stepTitle}>Tenant Provisioning</h4>
            <p className={styles.stepText}>
              Super Admin creates a new Agency Organization and provisions an Admin with secure email credentials.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>02</div>
            <h4 className={styles.stepTitle}>Client & Service Setup</h4>
            <p className={styles.stepText}>
              Organization Admin logs into their portal, onboards clients, sets retainer rates, and generates invoices.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>03</div>
            <h4 className={styles.stepTitle}>Collaborate & Deliver</h4>
            <p className={styles.stepText}>
              Clients access their private portal to track deliverables, submit requests, and handle payments smoothly.
            </p>
          </div>
        </div>
      </section>

      {/* ── Bottom Call To Action ── */}
      <section className={styles.bottomCtaSection}>
        <div className={styles.ctaBox}>
          <h2 className={styles.ctaTitle}>Ready to Experience ClientOps?</h2>
          <p className={styles.ctaDesc}>
            Sign in with your assigned role credentials to access your dedicated operational workspace.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link href="/auth?role=super_admin" className={styles.primaryBtn}>
              Super Admin Portal →
            </Link>
            <Link href="/auth?role=admin" className={styles.secondaryBtn}>
              Admin Portal →
            </Link>
            <Link href="/auth?role=client" className={styles.secondaryBtn}>
              Client Portal →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerTop}>
            <div className={styles.logoGroup}>
              <div className={styles.logoIcon} style={{ width: 30, height: 30, fontSize: '1rem' }}>C</div>
              <span className={styles.brandName} style={{ fontSize: '1rem' }}>ClientOps Platform</span>
            </div>

            <div className={styles.footerStatus}>
              <span className={styles.statusDot} />
              <span>All Systems Operational • Supabase Auth Secured</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20 }}>
            <p className={styles.footerCopy}>
              © {new Date().getFullYear()} ClientOps Inc. Multi-tenant Client Operations Platform. All rights reserved.
            </p>
            <div style={{ display: 'flex', gap: 16 }}>
              <Link href="/auth" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Portal Login</Link>
              <a href="#roles-access" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Role Overview</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
