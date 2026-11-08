import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "role-requests", phase: 1, register: routes });
