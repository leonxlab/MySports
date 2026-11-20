import { apiClient } from "@/lib/api-client";
import type { FeedFilters, FeedPage, RecordFeedSignalInput } from "./types";

export const feedApi = {
  getHomeFeed: (options: FeedFilters = {}) =>
    apiClient.request<FeedPage>("GET", "/feed/home", { query: { ...options } }),
  getExplore: (options: FeedFilters = {}) =>
    apiClient.request<FeedPage>("GET", "/feed/explore", { query: { ...options } }),
  recordSignal: (input: RecordFeedSignalInput) =>
    apiClient.request<{ id: string }>("POST", "/feed/signals", { body: input }),
};
