import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "scoring", phase: 2, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createScoringApi(app.ctx)
export { createScoringService as createScoringApi } from "./service";
export type { ScoringService as ScoringApi } from "./service";
