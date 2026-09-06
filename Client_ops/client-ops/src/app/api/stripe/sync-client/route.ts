import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
})

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'
)

function billingMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { client_id } = await request.json()
    if (!client_id) {
      return NextResponse.json({ error: 'Missing client_id' }, { status: 400 })
    }

    // Fetch the client from DB
    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single()

    if (clientErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // 1. Check if we have active checkout sessions with this client_id in metadata
    const sessions = await stripe.checkout.sessions.list({ limit: 20 })
    const matchingSession = sessions.data.find(
      s => (s.metadata?.client_id === client_id || (s.customer_email && s.customer_email.toLowerCase() === client.email.toLowerCase()) || (s.customer_details?.email && s.customer_details.email.toLowerCase() === client.email.toLowerCase())) &&
           s.payment_status === 'paid' &&
           s.status === 'complete'
    )

    let subscriptionId: string | null = client.stripe_subscription_id || (matchingSession?.subscription as string) || null
    let customerId: string | null = client.stripe_customer_id || (matchingSession?.customer as string) || null

    // 2. If no subscription found from session, check stripe customer by email
    if (!subscriptionId) {
      const customers = await stripe.customers.list({ email: client.email, limit: 5 })
      if (customers.data.length > 0) {
        customerId = customers.data[0].id
        const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 5 })
        if (subs.data.length > 0) {
          subscriptionId = subs.data[0].id
        }
      }
    }

    if (!subscriptionId) {
      return NextResponse.json({
        synced: false,
        message: 'No completed Stripe checkout or subscription found for this client yet.',
      })
    }

    // Retrieve subscription from Stripe
    const sub = await stripe.subscriptions.retrieve(subscriptionId)
    const anchorDate = new Date(sub.billing_cycle_anchor * 1000)
    const purchaseDate = anchorDate.toISOString().split('T')[0]
    const activeStatus = (sub.status === 'active' || sub.status === 'trialing') ? 'active' : sub.status === 'past_due' ? 'past_due' : sub.status === 'canceled' ? 'churned' : 'active'

    // Update Client in DB
    await supabaseAdmin.from('clients').update({
      stripe_customer_id: (sub.customer as string) || customerId,
      stripe_subscription_id: sub.id,
      status: activeStatus as Database['public']['Tables']['clients']['Row']['status'],
      purchase_date: purchaseDate,
    }).eq('id', client_id)

    // Upsert Subscription in DB
    await supabaseAdmin.from('subscriptions').upsert({
      stripe_subscription_id: sub.id,
      client_id: client_id,
      org_id: client.org_id,
      status: sub.status as Database['public']['Tables']['subscriptions']['Row']['status'],
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      latest_invoice_id: (sub.latest_invoice as string) || null,
    })

    // If there's an invoice in Stripe, sync it into invoices table
    if (sub.latest_invoice) {
      try {
        const invoiceId = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice.id
        const inv = await stripe.invoices.retrieve(invoiceId)
        await supabaseAdmin.from('invoices').upsert({
          stripe_invoice_id: inv.id,
          client_id: client_id,
          org_id: client.org_id,
          amount_cents: inv.amount_paid || inv.amount_due,
          currency: inv.currency.toUpperCase(),
          status: inv.status === 'paid' ? 'paid' : 'open',
          paid_at: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString(),
          attempt_count: inv.attempt_count || 1,
          hosted_invoice_url: inv.hosted_invoice_url || null,
          invoice_pdf: inv.invoice_pdf || null,
          billing_month: billingMonth(new Date()),
        })
      } catch (invErr) {
        console.warn('Could not sync latest invoice:', invErr)
      }
    }

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      org_id: client.org_id,
      client_id: client_id,
      action: 'stripe_sync_completed',
      payload: { subscription_id: sub.id, status: sub.status },
    })

    return NextResponse.json({
      synced: true,
      status: activeStatus,
      subscription_id: sub.id,
      customer_id: sub.customer,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe sync error'
    console.error('[sync-client]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
