import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "admin", phase: 1, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createAdminApi(app.ctx)
export { createAdminService as createAdminApi } from "./service";
export type { AdminService as AdminApi } from "./service";
