import ClientsPageView from '@/components/ClientsPageView'

export const dynamic = 'force-dynamic'

export default async function OrgClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ status?: string; q?: string }>
}) {
  const { slug } = await params
  const sp = searchParams ? await searchParams : {}
  return <ClientsPageView orgSlug={slug} searchParams={sp} />
}
