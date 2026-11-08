import type { AppContext } from "../../core/context";

/**
 * Logika bisnis modul equipment. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: equipment_items, equipment_rentals.
 */
export function createEquipmentService(_ctx: AppContext) {
  return {
    // TODO: tambahkan fungsi per endpoint
  };
}

export type EquipmentService = ReturnType<typeof createEquipmentService>;
