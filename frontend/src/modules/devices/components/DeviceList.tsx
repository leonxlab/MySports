import type { DeviceRole, DeviceView } from "../types";

export const ROLE_LABEL: Record<DeviceRole, string> = {
  camera_home: "Kamera Home",
  camera_away: "Kamera Away",
  controller: "Controller (Coach)",
};

const WARNING_LABEL: Record<string, string> = {
  RESOLUTION_BELOW_1080P: "Resolusi di bawah 1080p",
  FPS_BELOW_30: "FPS di bawah 30",
  NOT_CHARGING: "Tidak tersambung charger",
};

function status(d: DeviceView) {
  if (d.online) return "online";
  return d.lastSeenAt ? `offline, terakhir ${new Date(d.lastSeenAt).toLocaleTimeString()}` : "offline";
}

/** Daftar 3 slot device dengan status online dan peringatan kemampuan dari backend. */
export function DeviceList({ devices }: { devices: DeviceView[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {(Object.keys(ROLE_LABEL) as DeviceRole[]).map((role) => {
        const d = devices.find((x) => x.role === role);
        return (
          <li key={role} style={{ border: "1px solid #8884", borderRadius: 8, padding: 8, marginBottom: 8 }}>
            <strong>{ROLE_LABEL[role]}</strong>: {d ? status(d) : "belum terpasang"}
            {d?.capability && (
              <span>
                {" "}
                ({d.capability.width}x{d.capability.height}, {Math.round(d.capability.fps)} fps)
              </span>
            )}
            {d && d.warnings.length > 0 && (
              <p role="alert" style={{ color: "darkorange", margin: "4px 0 0" }}>
                {d.warnings.map((w) => WARNING_LABEL[w] ?? w).join(". ")}. Coach bisa memakai input manual.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
