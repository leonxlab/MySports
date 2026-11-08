import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "payments", phase: 1, register: routes });
