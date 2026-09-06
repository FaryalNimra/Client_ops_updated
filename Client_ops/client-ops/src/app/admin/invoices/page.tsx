export const dynamic = 'force-dynamic'

import InvoicesPageView from '@/components/InvoicesPageView'

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; month?: string; q?: string }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  return <InvoicesPageView searchParams={resolvedSearchParams} />
}
