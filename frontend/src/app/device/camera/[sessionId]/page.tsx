import { CameraScreen } from "@/modules/devices";
import { Page } from "@/modules/payments";

export default async function CameraPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return (
    <Page title="Kamera">
      <CameraScreen sessionId={sessionId} />
    </Page>
  );
}
