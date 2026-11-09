import { CoachOpenPlayForm } from "@/modules/open-play";
import { Page } from "@/modules/payments";

export default function NewOpenPlayPage() {
  return (
    <Page title="Buat open play">
      <CoachOpenPlayForm />
    </Page>
  );
}
