export const dynamic = 'force-dynamic'

import InvoicesPage from '@/app/admin/invoices/page'

export default async function OrgInvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ status?: string; month?: string; q?: string }>
}) {
  const { slug } = await params
  const sp = searchParams ? await searchParams : {}
  return <InvoicesPage orgSlug={slug} searchParams={sp} />
}

