import { MatchTimer } from "@/modules/match";
import { Page } from "@/modules/payments";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Page title="Match">
      <MatchTimer id={id} />
    </Page>
  );
}
