import { OpenPlayDetail } from "@/modules/open-play";

export default async function OpenPlayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OpenPlayDetail id={id} />;
}
