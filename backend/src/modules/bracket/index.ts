import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "bracket", phase: 2, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createBracketApi(app.ctx)
export { createBracketService as createBracketApi } from "./service";
export type { BracketService as BracketApi } from "./service";
