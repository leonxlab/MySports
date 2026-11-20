import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "vip", phase: 4, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createVipApi(app.ctx)
export { createVipService as createVipApi } from "./service";
export type { VipService as VipApi } from "./service";
