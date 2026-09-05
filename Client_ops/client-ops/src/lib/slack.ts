interface SlackFailedPaymentPayload {
  businessName: string
  clientEmail: string
  clientId: string
  amountCents: number
  currency: string
  invoiceUrl?: string | null
  attemptCount?: number
}

function formatCurrency(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

/**
 * Utility function to send non-blocking Slack alerts for payment failures.
 * Uses Slack Block Kit formatting. Reads process.env.SLACK_WEBHOOK_URL.
 */
export async function sendSlackAlert(payload: SlackFailedPaymentPayload): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    // Gracefully skip if SLACK_WEBHOOK_URL environment variable is missing
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const clientProfileUrl = `${appUrl}/admin/clients/${payload.clientId}`
  const formattedAmount = formatCurrency(payload.amountCents, payload.currency)

  const blockKitPayload = {
    text: `⚠️ Payment Failed for ${payload.businessName}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Payment Failure Alert',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Client Business:*\n${payload.businessName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Amount Due:*\n${formattedAmount}`,
          },
          {
            type: 'mrkdwn',
            text: `*Client Email:*\n${payload.clientEmail}`,
          },
          {
            type: 'mrkdwn',
            text: `*Payment Attempts:*\n${payload.attemptCount || 1}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🔍 View Client Hub',
              emoji: true,
            },
            url: clientProfileUrl,
            style: 'danger',
          },
          ...(payload.invoiceUrl ? [{
            type: 'button',
            text: {
              type: 'plain_text',
              text: '💳 Hosted Invoice Page',
              emoji: true,
            },
            url: payload.invoiceUrl,
          }] : []),
        ],
      },
    ],
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blockKitPayload),
    })

    if (!res.ok) {
      console.error(`Slack webhook returned status ${res.status}`)
    }
  } catch (err) {
    // Non-blocking: failure in Slack API does NOT throw or disrupt the Stripe webhook handler
    console.error('Failed to send Slack alert for failed payment:', err)
  }
}
