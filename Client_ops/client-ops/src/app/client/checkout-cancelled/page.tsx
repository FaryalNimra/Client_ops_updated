'use client'

import React from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function CheckoutCancelledPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '24px',
    }}>
      <div className="card animate-in" style={{
        maxWidth: 480,
        width: '100%',
        padding: '36px 28px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--color-border)',
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--color-warning-dim)',
          color: 'var(--color-warning)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <AlertCircle size={32} />
        </div>

        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)' }}>
            Checkout Incomplete
          </h1>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: 6, lineHeight: 1.5 }}>
            The checkout session was cancelled or paused. No charges were made to your account.
          </p>
        </div>

        <div style={{ width: '100%', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link
            href="/"
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', gap: 8 }}
          >
            <ArrowLeft size={16} />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
