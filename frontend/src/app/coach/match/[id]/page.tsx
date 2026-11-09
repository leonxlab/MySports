import { CoachMatchControl } from "@/modules/match";
import { Page } from "@/modules/payments";

export default async function CoachMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Page title="Kontrol match">
      <CoachMatchControl id={id} />
    </Page>
  );
}
