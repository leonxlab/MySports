export function VipSubscribeButton() {
  return (
    <button
      aria-disabled="true"
      aria-label="Langganan VIP, Coming soon"
      disabled
      title="Coming soon"
      type="button"
      style={{
        background: "#f1f5f9",
        border: "1px solid #cbd5e1",
        borderRadius: 8,
        color: "#475569",
        cursor: "not-allowed",
        font: "inherit",
        padding: "10px 12px",
      }}
    >
      Langganan VIP <span aria-hidden="true">(Coming soon)</span>
    </button>
  );
}
