import { Page } from "@/modules/payments";
import { MatchResult } from "@/modules/scoring";
import { GenerateHighlightButton } from "@/modules/vip";

export default async function MatchResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Page title="Hasil match">
      <MatchResult matchId={id} />
      <section aria-label="Fitur VIP" style={{ marginTop: 24 }}>
        <GenerateHighlightButton />
      </section>
    </Page>
  );
}
