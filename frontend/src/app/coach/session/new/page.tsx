import { CoachSessionNew } from "@/modules/devices";
import { FocusShell } from "@/components/feed";

export default async function CoachSessionNewPage({
  searchParams,
}: {
  searchParams: Promise<{ matchId?: string }>;
}) {
  const { matchId } = await searchParams;
  return (
    <FocusShell title="Sesi perangkat" exitHref="/open-play" status="Persiapan">
      <CoachSessionNew matchId={matchId} />
    </FocusShell>
  );
}
