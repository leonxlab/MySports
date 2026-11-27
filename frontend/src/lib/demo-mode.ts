import { env } from "./env";

export function isLocalDemoMode(): boolean {
  return process.env.NODE_ENV === "development" && env.appMode === "dev";
}
