import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "payments", phase: 1, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createPaymentsApi(app.ctx)
export { createPaymentsService as createPaymentsApi } from "./service";
export type { PaymentsService as PaymentsApi } from "./service";
