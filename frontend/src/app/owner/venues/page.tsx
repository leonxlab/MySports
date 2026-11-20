import { Page } from "@/modules/payments";
import { OwnerVenues } from "@/modules/venues";

export default function OwnerVenuesPage() {
  return (
    <Page title="Lapangan saya">
      <OwnerVenues />
    </Page>
  );
}
