import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "accounts", phase: 1, register: routes });
