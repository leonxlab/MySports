import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "venues", phase: 1, register: routes });
