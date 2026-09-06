export const dynamic = 'force-dynamic'

import InvoicesPageView from '@/components/InvoicesPageView'

export default async function OrgInvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ status?: string; month?: string; q?: string }>
}) {
  const { slug } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  return <InvoicesPageView searchParams={resolvedSearchParams} orgSlug={slug} />
}
