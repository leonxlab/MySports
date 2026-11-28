import { CoachBracket } from "@/modules/bracket";

export default async function CoachBracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CoachBracket openPlayId={id} />;
}
