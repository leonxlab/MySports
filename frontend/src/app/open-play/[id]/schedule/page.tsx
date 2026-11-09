import { BracketSchedule } from "@/modules/bracket";
import { Page } from "@/modules/payments";

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Page title="Jadwal main">
      <BracketSchedule openPlayId={id} />
    </Page>
  );
}
