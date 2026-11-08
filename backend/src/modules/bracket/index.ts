import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "bracket", phase: 2, register: routes });
