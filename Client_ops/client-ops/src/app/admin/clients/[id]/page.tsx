import ClientDetailView from '@/components/ClientDetailView'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ClientDetailView clientId={id} />
}
