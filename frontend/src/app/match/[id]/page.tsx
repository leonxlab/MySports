import { MatchTimer } from "@/modules/match";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MatchTimer id={id} />;
}
