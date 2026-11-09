"use client";

import { paymentsApi } from "../api";
import { formatTimeRange } from "../format";
import { useLoad } from "../useLoad";
import { Card, ErrorNote, Loading } from "./Status";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu pembayaran",
  confirmed: "Terkonfirmasi",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

export function MyBookings() {
  const { data, error, loading } = useLoad(() => paymentsApi.listMyBookings());
  if (loading) return <Loading />;
  return (
    <>
      <ErrorNote message={error} />
      {data?.length === 0 && <p>Belum ada booking.</p>}
      {data?.map((b) => (
        <Card key={b.id}>
          <div>{formatTimeRange(b.startsAt, b.endsAt)}</div>
          <div>{STATUS_LABEL[b.status] ?? b.status}</div>
        </Card>
      ))}
    </>
  );
}
