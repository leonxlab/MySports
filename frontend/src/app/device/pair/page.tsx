import { PairDevice } from "@/modules/devices";
import { Page } from "@/modules/payments";

export default async function PairPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <Page title="Pasang device">
      <PairDevice initialCode={code ?? ""} />
    </Page>
  );
}
