import { CoachBracket } from "@/modules/bracket";
import { Page } from "@/modules/payments";

export default async function CoachBracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Page title="Bracket">
      <CoachBracket openPlayId={id} />
    </Page>
  );
}
