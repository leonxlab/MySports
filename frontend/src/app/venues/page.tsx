import { Page } from "@/modules/payments";
import { VenueSearch } from "@/modules/venues";

export default function VenuesPage() {
  return (
    <Page title="Cari lapangan">
      <VenueSearch />
    </Page>
  );
}
