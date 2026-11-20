import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "role-requests", phase: 1, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createRoleRequestsApi(app.ctx)
export { createRoleRequestsService as createRoleRequestsApi } from "./service";
export type { RoleRequestsService as RoleRequestsApi } from "./service";
