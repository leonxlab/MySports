import { CoachOpenPlayManage } from "@/modules/open-play";
import { Page } from "@/modules/payments";

export default async function CoachOpenPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Page title="Kelola open play">
      <CoachOpenPlayManage id={id} />
    </Page>
  );
}
