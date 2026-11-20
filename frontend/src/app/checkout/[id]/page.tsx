import { CheckoutStatus, Page } from "@/modules/payments";

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Page title="Status pembayaran">
      <CheckoutStatus id={id} />
    </Page>
  );
}
