import { Page } from "@/modules/payments";
import { AdminVenueApprovals } from "@/modules/venues";

export default function VenueApprovalsPage() {
  return (
    <Page title="Persetujuan lapangan">
      <AdminVenueApprovals />
    </Page>
  );
}
