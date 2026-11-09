import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "accounts", phase: 1, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createAccountsApi(app.ctx)
export { createAccountsService as createAccountsApi } from "./service";
export type { AccountsService as AccountsApi } from "./service";
