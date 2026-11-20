import type { CommunityMedia, CommunitySport } from "@/modules/community/types";

export type FeedContentKind =
  "open_play" | "venue" | "equipment" | "thread" | "achievement" | "score";

export type FeedFormat = "text" | "photo" | "video";

export interface FeedItem {
  id: string;
  content_type: "thread" | "open_play" | "venue" | "equipment";
  content_kind: FeedContentKind;
  sport: CommunitySport | null;
  format: FeedFormat | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  title: string;
  body: string | null;
  created_at: string;
  media: CommunityMedia[];
  author: {
    id: string;
    display_name: string;
    photo_path: string | null;
    level: number;
  } | null;
  level_min: number | null;
  level_max: number | null;
  score: number | null;
  distance_km: number | null;
  reasons: string[];
}

export interface FeedPage {
  items: FeedItem[];
  next_cursor: string | null;
}

export interface FeedFilters {
  sport?: CommunitySport;
  content_kind?: FeedContentKind;
  format?: FeedFormat;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  limit?: number;
  cursor?: string;
}

export interface RecordFeedSignalInput {
  kind: "search" | "view_open_play" | "view_thread" | "post_thread" | "join_open_play";
  sport?: CommunitySport;
  term?: string;
  ref_id?: string;
}
