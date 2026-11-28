import { VenueDetail } from "@/modules/venues";

export default async function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VenueDetail id={id} />;
}
