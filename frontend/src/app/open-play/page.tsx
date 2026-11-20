import { OpenPlayList } from "@/modules/open-play";
import { Page } from "@/modules/payments";

export default function OpenPlayPage() {
  return (
    <Page title="Cari open play">
      <OpenPlayList />
    </Page>
  );
}
