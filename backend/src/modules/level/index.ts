import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "level", phase: 3, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createLevelApi(app.ctx)
export { createLevelService as createLevelApi } from "./service";
export type { LevelService as LevelApi } from "./service";
