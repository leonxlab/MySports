import { Page } from "@/modules/payments";
import { VenueDetail } from "@/modules/venues";

export default async function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Page title="Detail lapangan">
      <VenueDetail id={id} />
    </Page>
  );
}
