import { MatchSettingsEditor } from "@/modules/match";
import { Page } from "@/modules/payments";

export default async function MatchSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Page title="Setting match">
      <MatchSettingsEditor id={id} />
    </Page>
  );
}
