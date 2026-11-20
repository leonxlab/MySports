import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "devices", phase: 3, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createDevicesApi(app.ctx)
export { createDevicesService as createDevicesApi } from "./service";
export type { DevicesService as DevicesApi } from "./service";
