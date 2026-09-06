import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — important: getUser() validates and refreshes session token
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Helper to create redirect while copying refreshed session cookies
  function redirectWithCookies(targetUrl: URL | string) {
    const redirectResponse = NextResponse.redirect(targetUrl)
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // Public routes — skip auth redirects for landing page and auth callbacks
  if (pathname === '/' || pathname.startsWith('/auth/callback') || pathname.startsWith('/auth/magic-link')) {
    return supabaseResponse
  }

  // If user is on /auth, always allow immediately without running heavy DB lookups
  if (pathname.startsWith('/auth')) {
    return supabaseResponse
  }

  // Not authenticated → redirect to login if attempting protected route
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return redirectWithCookies(url)
  }

  // Helper to safely decode JWT payload in Edge runtime
  function parseJwt(token: string) {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch {
      return {}
    }
  }

  // Extract user role from JWT claims or user metadata
  const { data: { session } } = await supabase.auth.getSession()
  const claims = session?.access_token ? parseJwt(session.access_token) : {}
  
  let role: string | undefined = undefined

  // Multi-tiered role lookup: custom claims -> metadata -> DB profile fallback
  if (claims.role && claims.role !== 'authenticated' && claims.role !== 'anon') {
    role = claims.role
  } else if (claims.user_metadata?.role) {
    role = claims.user_metadata.role
  } else if (claims.app_metadata?.role) {
    role = claims.app_metadata.role
  } else if (user.user_metadata?.role) {
    role = user.user_metadata.role
  } else if (user.app_metadata?.role) {
    role = user.app_metadata.role
  }

  // Fetch profile for role and org_id
  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single() as { data: { role?: string; org_id?: string | null } | null }

  if (rawProfile?.role) {
    role = rawProfile.role
  }

  // Fetch org slug if user is an admin
  let orgSlug: string | undefined = undefined
  if (role === 'admin' && rawProfile?.org_id) {
    const { data: rawOrg } = await supabase
      .from('organizations')
      .select('slug')
      .eq('id', rawProfile.org_id)
      .single() as { data: { slug?: string } | null }

    if (rawOrg?.slug) {
      orgSlug = rawOrg.slug
    }
  }

  // If user is accessing /auth, allow them to view auth page so they can login or switch accounts
  if (pathname.startsWith('/auth')) {
    return supabaseResponse
  }

  // Route protection for super-admin
  if (pathname.startsWith('/super-admin') && role !== 'super_admin') {
    if (role === 'admin') {
      const target = orgSlug ? `/org/${orgSlug}/dashboard` : '/admin/dashboard'
      return redirectWithCookies(new URL(target, request.url))
    }
    if (role === 'client') return redirectWithCookies(new URL('/client/dashboard', request.url))
    return redirectWithCookies(new URL('/auth', request.url))
  }

  // If admin accesses generic /admin/* route, redirect to their custom /org/[slug]/* workspace
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin' && role !== 'super_admin') {
      if (role === 'client') return redirectWithCookies(new URL('/client/dashboard', request.url))
      return redirectWithCookies(new URL('/auth', request.url))
    }
    if (role === 'admin' && orgSlug) {
      const subPath = pathname.replace(/^\/admin/, '') || '/dashboard'
      return redirectWithCookies(new URL(`/org/${orgSlug}${subPath}`, request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/stripe).*)'],
}
