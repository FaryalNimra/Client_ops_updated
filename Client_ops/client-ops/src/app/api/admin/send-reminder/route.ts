import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder')

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: rawProfile } = await supabase
      .from('profiles')
      .select('role, org_id, full_name, email')
      .eq('id', user.id)
      .single()

    const profile = rawProfile as { role: string; org_id: string | null; full_name: string | null; email: string } | null

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { clientId, clientEmail, subject, bodyText, invoiceUrl } = body

    if (!clientId || !clientEmail || !subject || !bodyText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Send Dunning Reminder Email via Resend
    let emailSent = false
    try {
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'billing@agency.com',
          to: [clientEmail],
          subject: subject,
          html: bodyText.replace(/\n/g, '<br />'),
        })
        emailSent = true
      }
    } catch (emailErr) {
      console.error('Failed to send dunning reminder email via Resend:', emailErr)
    }

    // Write event to activity_log (PRD v0.2 Requirement F4)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('activity_log') as any).insert({
      org_id: profile.org_id,
      client_id: clientId,
      actor: profile.full_name || profile.email,
      action: 'dunning_reminder_sent',
      payload: {
        recipient: clientEmail,
        subject,
        invoice_url: invoiceUrl || null,
        email_sent: emailSent,
        sent_at: new Date().toISOString(),
      },
    })

    return NextResponse.json({ success: true, emailSent })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
