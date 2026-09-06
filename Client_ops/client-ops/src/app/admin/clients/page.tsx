import ClientsPageView from '@/components/ClientsPageView'

export const dynamic = 'force-dynamic'

export default async function ClientsPage(props: {
  searchParams?: Promise<{ status?: string; q?: string }> | { status?: string; q?: string }
}) {
  const sp = props.searchParams ? await props.searchParams : {}
  return <ClientsPageView searchParams={sp} />
}
