import { Page } from "@/modules/payments";
import { OwnerSchedule } from "@/modules/venues";

export default async function VenueSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Page title="Court, jadwal, dan harga">
      <OwnerSchedule venueId={id} />
    </Page>
  );
}
