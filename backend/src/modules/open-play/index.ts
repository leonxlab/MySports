import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "open-play", phase: 1, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createOpenPlayApi(app.ctx)
export { createOpenPlayService as createOpenPlayApi } from "./service";
export type { OpenPlayService as OpenPlayApi } from "./service";
