import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "match", phase: 2, register: routes });
