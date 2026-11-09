import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "match", phase: 2, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createMatchApi(app.ctx)
export { createMatchService as createMatchApi } from "./service";
export type { MatchService as MatchApi } from "./service";
