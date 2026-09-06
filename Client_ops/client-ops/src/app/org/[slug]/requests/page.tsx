export const dynamic = 'force-dynamic'

import RequestsPageView from '@/components/RequestsPageView'

export default async function OrgRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ status?: string }>
}) {
  const { slug } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  return <RequestsPageView searchParams={resolvedSearchParams} orgSlug={slug} />
}
