'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import SendReminderModal from '@/components/SendReminderModal'

interface Props {
  clientId: string
  clientName: string
  contactName?: string | null
  clientEmail: string
  amountCents?: number | null
  currency?: string
}

export default function ReminderActionButton({
  clientId,
  clientName,
  contactName,
  clientEmail,
  amountCents,
  currency,
}: Props) {
  const [openModal, setOpenModal] = useState(false)

  return (
    <>
      <button
        id={`send-reminder-${clientId}`}
        className="btn btn-danger btn-sm"
        onClick={() => setOpenModal(true)}
        style={{ gap: 6 }}
      >
        <Mail size={14} />
        Send reminder
      </button>

      {openModal && (
        <SendReminderModal
          clientId={clientId}
          clientName={clientName}
          contactName={contactName}
          clientEmail={clientEmail}
          amountCents={amountCents}
          currency={currency}
          onClose={() => setOpenModal(false)}
        />
      )}
    </>
  )
}
