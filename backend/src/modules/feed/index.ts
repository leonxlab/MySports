import { defineModule } from "../../core/module";
import { routes } from "./routes";

export default defineModule({ name: "feed", phase: 1, register: routes });

// Satu-satunya pintu untuk modul lain (rules.md bagian 3). Panggil: createFeedApi(app.ctx)
export { createFeedService as createFeedApi } from "./service";
export type { FeedService as FeedApi } from "./service";
