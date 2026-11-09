export function VipBadge({ isVip }: { isVip: boolean }) {
  if (!isVip) return null;
  return (
    <span
      aria-label="Status VIP"
      role="img"
      title="VIP"
      style={{
        background: "#fef3c7",
        border: "1px solid #f59e0b",
        borderRadius: 999,
        color: "#92400e",
        display: "inline-block",
        fontSize: 13,
        fontWeight: 600,
        padding: "3px 9px",
      }}
    >
      VIP
    </span>
  );
}
