import { CoachOpenPlayManage } from "@/modules/open-play";

export default async function CoachOpenPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CoachOpenPlayManage id={id} />;
}
