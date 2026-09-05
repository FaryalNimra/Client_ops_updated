import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { sendSlackAlert } from '@/lib/slack'
import type { Database } from '@/types/database'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
})

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'
)

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder')

function billingMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

async function logActivity(
  orgId: string | null,
  clientId: string | null,
  action: string,
  payload?: Record<string, unknown>
) {
  await supabase.from('activity_log').insert({
    org_id:    orgId,
    client_id: clientId,
    action,
    payload:   (payload as unknown as Database['public']['Tables']['activity_log']['Insert']['payload']) ?? null,
  })
}

async function notifyAdmins(subject: string, html: string, orgId: string) {
  // Get all admin emails for this org
  const { data: admins } = await supabase
    .from('profiles')
    .select('email')
    .eq('org_id', orgId)
    .eq('role', 'admin')

  if (!admins?.length) return

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'ops@yourdomain.com',
    to:   admins.map(a => a.email),
    subject,
    html,
  })

  // Slack (optional)
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `${subject}\n${html.replace(/<[^>]+>/g, '')}` }),
    }).catch(() => {})
  }
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig  = request.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  if (process.env.NODE_ENV === 'test' || process.env.BYPASS_WEBHOOK_SIG === 'true') {
    try {
      event = JSON.parse(body) as Stripe.Event
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }
  } else {
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err: unknown) {
      console.error('[webhook] Signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  // ── Idempotency check ──────────────────────────────────
  const { data: existing } = await supabase
    .from('webhook_events')
    .select('stripe_event_id')
    .eq('stripe_event_id', event.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ received: true, skipped: 'duplicate' })
  }

  // Record event before processing
  await supabase.from('webhook_events').insert({
    stripe_event_id: event.id,
    type:            event.type,
  })

  try {
    switch (event.type) {
      // ── Checkout completed ───────────────────────────
      case 'checkout.session.completed': {
        const session   = event.data.object as Stripe.Checkout.Session
        const clientId  = session.metadata?.client_id
        const orgId     = session.metadata?.org_id

        if (!clientId || !orgId || session.mode !== 'subscription') break

        const customerId     = session.customer as string
        const subscriptionId = session.subscription as string

        // Fetch subscription to get anchor date
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const anchorDate = new Date(sub.billing_cycle_anchor * 1000)
        const purchaseDate = anchorDate.toISOString().split('T')[0]

        // Update client
        await supabase.from('clients').update({
          stripe_customer_id:    customerId,
          stripe_subscription_id: subscriptionId,
          status:                'active',
          purchase_date:         purchaseDate,
        }).eq('id', clientId)

        // Upsert subscription mirror
        await supabase.from('subscriptions').upsert({
          stripe_subscription_id: subscriptionId,
          client_id:  clientId,
          org_id:     orgId,
          status:     'active',
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:   new Date(sub.current_period_end   * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          latest_invoice_id:    sub.latest_invoice as string | null,
        })

        await logActivity(orgId, clientId, 'checkout_completed', { subscription_id: subscriptionId })

        // Welcome email to client
        const { data: client } = await supabase
          .from('clients')
          .select('email, contact_name, business_name')
          .eq('id', clientId)
          .single()

        if (client) {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? 'ops@yourdomain.com',
            to:   client.email,
            subject: `Welcome to Landing Page Care — ${client.business_name}`,
            html: `
              <p>Hi ${client.contact_name ?? client.business_name},</p>
              <p>Your subscription is now active. You can view your invoices and submit change requests in your client portal.</p>
              <p>We'll be in touch!</p>
            `,
          })
        }
        break
      }

      // ── Invoice paid ─────────────────────────────────
      case 'invoice.paid': {
        const invoice   = event.data.object as Stripe.Invoice
        const sub       = await stripe.subscriptions.retrieve(invoice.subscription as string)
        const clientId  = sub.metadata.client_id
        const orgId     = sub.metadata.org_id

        if (!clientId || !orgId) break

        await supabase.from('invoices').upsert({
          stripe_invoice_id:  invoice.id,
          client_id:          clientId,
          org_id:             orgId,
          amount_cents:       invoice.amount_paid,
          currency:           invoice.currency.toUpperCase(),
          status:             'paid',
          paid_at:            invoice.status_transitions.paid_at
                                ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
                                : null,
          attempt_count:      invoice.attempt_count,
          hosted_invoice_url: invoice.hosted_invoice_url ?? null,
          invoice_pdf:        invoice.invoice_pdf ?? null,
          billing_month:      billingMonth(),
        })

        // Clear past_due if it was set
        await supabase.from('clients')
          .update({ status: 'active' })
          .eq('id', clientId)
          .eq('status', 'past_due')

        await logActivity(orgId, clientId, 'invoice_paid', {
          amount: invoice.amount_paid,
          currency: invoice.currency,
        })
        break
      }

      // ── Payment failed ───────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        let clientId = (invoice.metadata?.client_id as string) || null
        let orgId = (invoice.metadata?.org_id as string) || null

        if ((!clientId || !orgId) && invoice.subscription && typeof invoice.subscription === 'string') {
          try {
            const sub = await stripe.subscriptions.retrieve(invoice.subscription)
            clientId = clientId || sub.metadata?.client_id || null
            orgId = orgId || sub.metadata?.org_id || null
          } catch (subErr) {
            console.warn('Could not retrieve subscription metadata from Stripe API:', subErr)
          }
        }

        if (!clientId || !orgId) break

        await supabase.from('invoices').upsert({
          stripe_invoice_id:  invoice.id,
          client_id:          clientId,
          org_id:             orgId,
          amount_cents:       invoice.amount_due,
          currency:           invoice.currency.toUpperCase(),
          status:             'open',
          attempt_count:      invoice.attempt_count,
          hosted_invoice_url: invoice.hosted_invoice_url ?? null,
          invoice_pdf:        invoice.invoice_pdf ?? null,
          billing_month:      billingMonth(),
        })

        // Set client to past_due
        await supabase.from('clients')
          .update({ status: 'past_due' })
          .eq('id', clientId)

        await logActivity(orgId, clientId, 'payment_failed', {
          amount:        invoice.amount_due,
          attempt_count: invoice.attempt_count,
        })

        // Fetch client details for email
        const { data: client } = await supabase
          .from('clients')
          .select('business_name, email, contact_name')
          .eq('id', clientId)
          .single()

        const amount = `${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`
        await notifyAdmins(
          `⚠️ Payment failed — ${client?.business_name ?? clientId}`,
          `
            <p><strong>${client?.business_name}</strong> (${client?.email}) failed payment.</p>
            <p>Amount: <strong>${amount}</strong> · Attempt #${invoice.attempt_count}</p>
            ${invoice.hosted_invoice_url ? `<p><a href="${invoice.hosted_invoice_url}">View invoice</a></p>` : ''}
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/clients/${clientId}">View client record →</a></p>
          `,
          orgId
        )

        // Trigger non-blocking Slack alert via Block Kit
        await sendSlackAlert({
          businessName: client?.business_name || clientId,
          clientEmail: client?.email || '',
          clientId,
          amountCents: invoice.amount_due,
          currency: invoice.currency.toUpperCase(),
          invoiceUrl: invoice.hosted_invoice_url ?? null,
          attemptCount: invoice.attempt_count ?? 1,
        })

        break
      }

      // ── Subscription updated ─────────────────────────
      case 'customer.subscription.updated': {
        const sub      = event.data.object as Stripe.Subscription
        const clientId = sub.metadata.client_id
        const orgId    = sub.metadata.org_id

        if (!clientId || !orgId) break

        await supabase.from('subscriptions').upsert({
          stripe_subscription_id: sub.id,
          client_id:  clientId,
          org_id:     orgId,
          status:     sub.status as Database['public']['Tables']['subscriptions']['Row']['status'],
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:   new Date(sub.current_period_end   * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          latest_invoice_id:    sub.latest_invoice as string | null,
        })

        await logActivity(orgId, clientId, 'subscription_updated', { status: sub.status })
        break
      }

      // ── Subscription deleted / cancelled ─────────────
      case 'customer.subscription.deleted': {
        const sub      = event.data.object as Stripe.Subscription
        const clientId = sub.metadata.client_id
        const orgId    = sub.metadata.org_id

        if (!clientId || !orgId) break

        await supabase.from('clients')
          .update({ status: 'churned' })
          .eq('id', clientId)

        await supabase.from('subscriptions').upsert({
          stripe_subscription_id: sub.id,
          client_id:  clientId,
          org_id:     orgId,
          status:     'canceled',
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:   new Date(sub.current_period_end   * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          latest_invoice_id:    sub.latest_invoice as string | null,
        })

        await logActivity(orgId, clientId, 'subscription_cancelled', {})

        await notifyAdmins(
          `🔴 Subscription cancelled — ${clientId}`,
          `<p>Client subscription has ended. Please check churn reason and update the record.</p>
           <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/clients/${clientId}">View client →</a></p>`,
          orgId
        )
        break
      }

      // ── Refund ───────────────────────────────────────
      case 'charge.refunded': {
        const charge   = event.data.object as Stripe.Charge
        const clientId = charge.metadata?.client_id
        const orgId    = charge.metadata?.org_id
        await logActivity(orgId ?? null, clientId ?? null, 'charge_refunded', {
          amount:   charge.amount_refunded,
          currency: charge.currency,
        })
        break
      }

      default:
        break
    }

    // Mark event processed
    await supabase.from('webhook_events').update({
      processed_at: new Date().toISOString(),
    }).eq('stripe_event_id', event.id)

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Handler error'
    console.error('[webhook] Handler error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}


