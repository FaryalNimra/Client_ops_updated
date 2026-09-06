import ClientDetailView from '@/components/ClientDetailView'

export default async function OrgClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  return <ClientDetailView clientId={id} orgSlug={slug} />
}
