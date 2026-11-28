import { PairDevice } from "@/modules/devices";
import { FocusShell } from "@/components/feed";

export default async function PairPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <FocusShell title="Pasang perangkat" exitHref="/open-play" status="Persiapan">
      <PairDevice initialCode={code ?? ""} />
    </FocusShell>
  );
}
