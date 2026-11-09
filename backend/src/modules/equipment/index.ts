import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "equipment", phase: 4, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createEquipmentApi(app.ctx)
export { createEquipmentService as createEquipmentApi } from "./service";
export type { EquipmentService as EquipmentApi } from "./service";
