import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "admin", phase: 1, register: routes });
