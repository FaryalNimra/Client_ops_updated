import ClientsPageView from '@/components/ClientsPageView'

export const dynamic = 'force-dynamic'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; q?: string }>
}) {
  const sp = searchParams ? await searchParams : {}
  return <ClientsPageView searchParams={sp} />
}
