'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme/ThemeContext'

interface ThemeToggleProps {
  /** extra inline styles if needed */
  style?: React.CSSProperties
  /** size variant: 'sm' | 'md' (default md) */
  size?: 'sm' | 'md'
}

export default function ThemeToggle({ style, size = 'md' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  const dim = size === 'sm' ? 28 : 36
  const iconSize = size === 'sm' ? 14 : 17

  return (
    <button
      id="theme-toggle"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      onClick={toggleTheme}
      style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface-2)',
        color: 'var(--color-text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease, transform 150ms ease',
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.background = 'var(--color-surface-hover)'
        el.style.color = 'var(--color-primary)'
        el.style.borderColor = 'var(--color-border-active)'
        el.style.transform = 'scale(1.08)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.background = 'var(--color-surface-2)'
        el.style.color = 'var(--color-text-muted)'
        el.style.borderColor = 'var(--color-border)'
        el.style.transform = 'scale(1)'
      }}
    >
      {theme === 'light'
        ? <Moon size={iconSize} strokeWidth={2} />
        : <Sun size={iconSize} strokeWidth={2} />
      }
    </button>
  )
}
