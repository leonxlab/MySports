import type { AppContext } from "../../core/context";

/**
 * Logika bisnis modul devices. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: device_sessions, session_devices, video_segments.
 */
export function createDevicesService(_ctx: AppContext) {
  return {
    // TODO: tambahkan fungsi per endpoint
  };
}

export type DevicesService = ReturnType<typeof createDevicesService>;
