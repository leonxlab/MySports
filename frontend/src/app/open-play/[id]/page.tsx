import { OpenPlayDetail } from "@/modules/open-play";
import { Page } from "@/modules/payments";

export default async function OpenPlayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Page title="Detail open play">
      <OpenPlayDetail id={id} />
    </Page>
  );
}
