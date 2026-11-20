import { Page } from "@/modules/payments";
import { OwnerVenueForm } from "@/modules/venues";

export default function NewVenuePage() {
  return (
    <Page title="Daftarkan lapangan">
      <OwnerVenueForm />
    </Page>
  );
}
