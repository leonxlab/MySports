import { EquipmentFeed } from "@/modules/equipment";

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EquipmentFeed itemId={id} mode="detail" />;
}
