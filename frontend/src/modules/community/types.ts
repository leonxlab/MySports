import type { Sport } from "@/modules/accounts/types";

export type CommunitySport = Sport;
export type MediaType = "image" | "video";

export interface CommunityMedia {
  type: MediaType;
  path: string;
  url?: string;
}

export interface CommunityAuthor {
  id: string;
  display_name: string;
  photo_path: string | null;
  level: number;
}

export interface CommunityThread {
  id: string;
  author_id: string;
  author: CommunityAuthor | null;
  sport: CommunitySport;
  title: string;
  body: string | null;
  media: CommunityMedia[];
  created_at: string;
}

export interface CommunityPost {
  id: string;
  thread_id: string;
  author_id: string;
  author: CommunityAuthor | null;
  body: string;
  media: CommunityMedia[];
  created_at: string;
}

export interface ThreadDetail extends CommunityThread {
  posts: CommunityPost[];
}

export interface ThreadPage {
  items: CommunityThread[];
  next_cursor: string | null;
}

export interface CommunityReport {
  id: string;
  reporter_id: string;
  reporter: CommunityAuthor | null;
  target_type: "thread" | "post";
  target_id: string;
  reason: string | null;
  status: "open" | "resolved" | "dismissed";
  resolved_by: string | null;
  created_at: string;
  target: CommunityReportTarget | null;
}

export interface ReportPage {
  items: CommunityReport[];
  next_cursor: string | null;
}

export interface CommunityReportTarget {
  id: string;
  thread_id?: string;
  title?: string;
  body: string | null;
  media: CommunityMedia[];
  hidden: boolean;
  author: CommunityAuthor;
}

export interface SignedCommunityUpload {
  path: string;
  token: string;
  signedUrl: string;
}
