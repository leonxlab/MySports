import { CoachMatchControl } from "@/modules/match";

export default async function CoachMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CoachMatchControl id={id} />;
}
