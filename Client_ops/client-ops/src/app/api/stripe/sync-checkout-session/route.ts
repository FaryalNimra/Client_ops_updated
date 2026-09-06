import Stripe from 'stripe'
import { NextResponse } from 'next/server'
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
    const { session_id } = await request.json()

    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    // Retrieve the verified checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['customer', 'subscription'],
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found in Stripe' }, { status: 404 })
    }

    const clientId = session.metadata?.client_id
    const orgId = session.metadata?.org_id
    const customerEmail = session.customer_details?.email || session.customer_email || ''

    if (!clientId) {
      return NextResponse.json({ error: 'No client_id in session metadata' }, { status: 400 })
    }

    const isPaid = session.payment_status === 'paid' || session.status === 'complete'
    if (!isPaid) {
      return NextResponse.json({ success: false, message: 'Payment is not completed yet.' })
    }

    let customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null

    let purchaseDate = new Date().toISOString().split('T')[0]

    // If subscription is present, fetch anchor date and details
    if (subscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        if (sub.billing_cycle_anchor) {
          purchaseDate = new Date(sub.billing_cycle_anchor * 1000).toISOString().split('T')[0]
        }
        if (!customerId && sub.customer) {
          customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        }

        // Upsert subscription
        if (orgId) {
          await supabaseAdmin.from('subscriptions').upsert({
            stripe_subscription_id: sub.id,
            client_id: clientId,
            org_id: orgId,
            status: 'active',
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            latest_invoice_id: (typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice?.id) || null,
          })
        }

        // Upsert invoice if available
        if (sub.latest_invoice) {
          const invId = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice.id
          try {
            const inv = await stripe.invoices.retrieve(invId)
            const targetOrgId = (orgId || session.metadata?.org_id || '') as string
            if (targetOrgId) {
              await supabaseAdmin.from('invoices').upsert({
                stripe_invoice_id: inv.id,
                client_id: clientId,
                org_id: targetOrgId,
                amount_cents: inv.amount_paid || inv.amount_due || (session.amount_total ?? 0),
                currency: (inv.currency || session.currency || 'EUR').toUpperCase(),
                status: 'paid',
                paid_at: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString(),
                attempt_count: inv.attempt_count || 1,
                hosted_invoice_url: inv.hosted_invoice_url || null,
                invoice_pdf: inv.invoice_pdf || null,
                billing_month: billingMonth(new Date()),
              })
            }
          } catch (invErr) {
            console.warn('Error fetching invoice:', invErr)
          }
        }
      } catch (subErr) {
        console.warn('Error retrieving subscription details:', subErr)
      }
    }

    // Update Client in DB
    const updatePayload: Record<string, unknown> = {
      status: 'active',
      purchase_date: purchaseDate,
    }
    if (customerId) updatePayload.stripe_customer_id = customerId
    if (subscriptionId) updatePayload.stripe_subscription_id = subscriptionId
    if (customerEmail) updatePayload.email = customerEmail

    const { error: updateErr } = await supabaseAdmin
      .from('clients')
      .update(updatePayload)
      .eq('id', clientId)

    if (updateErr) {
      console.error('Error updating client in DB:', updateErr)
    }

    // Log Activity
    if (orgId) {
      await supabaseAdmin.from('activity_log').insert({
        org_id: orgId,
        client_id: clientId,
        action: 'checkout_completed',
        payload: {
          session_id,
          subscription_id: subscriptionId,
          customer_email: customerEmail,
        },
      })
    }

    return NextResponse.json({
      success: true,
      client_id: clientId,
      customer_email: customerEmail,
      business_name: session.metadata?.business_name || '',
      status: 'active',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Checkout sync error'
    console.error('[sync-checkout-session]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
