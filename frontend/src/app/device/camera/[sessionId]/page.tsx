import { CameraScreen } from "@/modules/devices";
import { FocusShell } from "@/components/feed";

export default async function CameraPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ camera?: string }>;
}) {
  const [{ sessionId }, query] = await Promise.all([params, searchParams]);
  const camera = query.camera === "away" ? "away" : "home";
  return (
    <FocusShell
      title={`Kamera ${camera === "home" ? "utama" : "kedua"}`}
      exitHref="/open-play"
      status="Live"
    >
      <CameraScreen sessionId={sessionId} camera={camera} />
    </FocusShell>
  );
}
