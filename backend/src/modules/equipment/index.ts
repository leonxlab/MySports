import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "equipment", phase: 4, register: routes });
