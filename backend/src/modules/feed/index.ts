import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "feed", phase: 1, register: routes });
