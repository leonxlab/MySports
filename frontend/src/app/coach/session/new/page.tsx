import { CoachSessionNew } from "@/modules/devices";
import { Page } from "@/modules/payments";

export default async function CoachSessionNewPage({
  searchParams,
}: {
  searchParams: Promise<{ matchId?: string }>;
}) {
  const { matchId } = await searchParams;
  return (
    <Page title="Sesi device">
      <CoachSessionNew matchId={matchId} />
    </Page>
  );
}
