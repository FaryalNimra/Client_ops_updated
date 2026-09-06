export const dynamic = 'force-dynamic'

import ClientsPage from '@/app/admin/clients/page'

export default async function OrgClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ status?: string; q?: string }>
}) {
  const { slug } = await params
  const sp = searchParams ? await searchParams : {}
  return <ClientsPage orgSlug={slug} searchParams={sp} />
}

