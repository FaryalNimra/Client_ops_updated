export const dynamic = 'force-dynamic'

import RequestsPage from '@/app/admin/requests/page'

export default async function OrgRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ status?: string }>
}) {
  const { slug } = await params
  const sp = searchParams ? await searchParams : {}
  return <RequestsPage orgSlug={slug} searchParams={sp} />
}

