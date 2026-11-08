import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "devices", phase: 3, register: routes });
