import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "venues", phase: 1, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createVenuesApi(app.ctx)
export { createVenuesService as createVenuesApi } from "./service";
export type { VenuesService as VenuesApi } from "./service";
