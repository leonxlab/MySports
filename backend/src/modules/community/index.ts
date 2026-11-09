import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "community", phase: 1, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createCommunityApi(app.ctx)
export { createCommunityService as createCommunityApi } from "./service";
export type { CommunityService as CommunityApi } from "./service";
