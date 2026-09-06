export const dynamic = 'force-dynamic'

import RequestsPageView from '@/components/RequestsPageView'

export default async function RequestsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  return <RequestsPageView searchParams={resolvedSearchParams} />
}
