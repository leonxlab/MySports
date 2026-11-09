import { randomUUID } from "node:crypto";
import type { AppContext } from "../../core/context";
import { AppError, notFound } from "../../core/errors";
import { createAccountsApi } from "../accounts";
import {
  type AddPostInput,
  type CreateReportInput,
  type CreateThreadInput,
  type ListReportsInput,
  type ListThreadsInput,
  type ResolveReportInput,
  type SignMediaInput,
  cursorSchema,
  mediaItemSchema,
} from "./schema";
import type { z } from "zod";

type MediaItem = z.infer<typeof mediaItemSchema>;
type Cursor = { created_at: string; id: string };
const mediaBucket = "media";
// TODO(decision): confirm the initial per-hour activity limits with the product team.
const threadCreationLimitPerHour = 5;
const contentReportLimitPerHour = 10;
const mediaExtensions: Record<SignMediaInput["content_type"], string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
};

function encodeCursor(cursor: Cursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value?: string): Cursor | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const result = cursorSchema.safeParse(parsed);
    if (!result.success) throw new Error("invalid cursor");
    return result.data;
  } catch {
    throw new AppError(400, "INVALID_CURSOR", "Cursor tidak valid");
  }
}

export function createCommunityService(ctx: AppContext) {
  const { supabase } = ctx;
  const accounts = createAccountsApi(ctx);
  const media = () => supabase.storage.from(mediaBucket);

  function assertOwnedMedia(userId: string, items: MediaItem[]) {
    for (const item of items) {
      const match = item.path.match(
        /^([^/]+)\/community\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|mp4|webm)$/i,
      );
      if (!match || match[1] !== userId) {
        throw new AppError(400, "INVALID_MEDIA_PATH", "Path media komunitas tidak valid");
      }
      const extension = match[2].toLowerCase();
      const expectedType = item.type === "image" ? ["jpg", "jpeg", "png", "webp"] : ["mp4", "webm"];
      if (!expectedType.includes(extension)) {
        throw new AppError(400, "INVALID_MEDIA_TYPE", "Tipe media tidak sesuai dengan path");
      }
    }
  }

  async function addMediaUrls(items: MediaItem[]) {
    return Promise.all(
      items.map(async (item) => {
        const { data, error } = await media().createSignedUrl(item.path, 3600);
        if (error) throw error;
        return { ...item, url: data.signedUrl };
      }),
    );
  }

  async function addAuthors<T extends { author_id: string }>(items: T[]) {
    const profileRows = await accounts.getProfileSummaries([
      ...new Set(items.map((item) => item.author_id)),
    ]);
    const profiles = new Map(profileRows.map((profile) => [profile.id, profile]));
    return items.map((item) => ({ ...item, author: profiles.get(item.author_id) ?? null }));
  }

  async function checkRateLimit(
    table: "threads" | "content_reports",
    userId: string,
    maximum: number,
  ) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(table === "threads" ? "author_id" : "reporter_id", userId)
      .gte("created_at", since);
    if (error) throw error;
    if ((count ?? 0) >= maximum) {
      throw new AppError(429, "RATE_LIMITED", "Batas aktivitas tercapai. Coba lagi nanti.");
    }
  }

  async function getThreadRow(id: string) {
    const { data, error } = await supabase
      .from("threads")
      .select("id, author_id, sport, title, body, media, created_at, hidden")
      .eq("id", id)
      .eq("hidden", false)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound("THREAD_NOT_FOUND", "Thread tidak ditemukan");
    return data;
  }

  async function reportTargetExists(input: CreateReportInput) {
    const table = input.target_type === "thread" ? "threads" : "thread_posts";
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("id", input.target_id)
      .eq("hidden", false)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound("CONTENT_NOT_FOUND", "Konten tidak ditemukan");
  }

  async function listThreads(input: ListThreadsInput) {
    const cursor = decodeCursor(input.cursor);
    let query = supabase
      .from("threads")
      .select("id, author_id, sport, title, body, media, created_at")
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(input.limit + 1);
    if (input.sport) query = query.eq("sport", input.sport);
    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = data ?? [];
    const hasMore = rows.length > input.limit;
    const page = rows.slice(0, input.limit);
    const [withAuthors, withMedia] = await Promise.all([
      addAuthors(page),
      Promise.all(
        page.map(async (thread) => ({ ...thread, media: await addMediaUrls(thread.media ?? []) })),
      ),
    ]);
    const authors = new Map(withAuthors.map((thread) => [thread.id, thread.author]));
    const items = withMedia.map((thread) => ({
      ...thread,
      author: authors.get(thread.id) ?? null,
    }));
    const last = page.at(-1);
    return {
      items,
      next_cursor:
        hasMore && last ? encodeCursor({ created_at: last.created_at, id: last.id }) : null,
    };
  }

  return {
    listThreads,

    async listRecentThreads(filter: { sport?: ListThreadsInput["sport"]; limit?: number } = {}) {
      return listThreads({ ...filter, limit: filter.limit ?? 20 });
    },

    async createThread(userId: string, input: CreateThreadInput) {
      assertOwnedMedia(userId, input.media);
      await checkRateLimit("threads", userId, threadCreationLimitPerHour);
      const { data, error } = await supabase
        .from("threads")
        .insert({
          author_id: userId,
          sport: input.sport,
          title: input.title,
          body: input.body || null,
          media: input.media,
        })
        .select("id, author_id, sport, title, body, media, created_at")
        .single();
      if (error) throw error;
      // TODO(integration): call createFeedApi(ctx).classifyContent for this thread.
      // TODO(integration): call createFeedApi(ctx).recordSignal when a user creates a thread.
      const [author, signedMedia] = await Promise.all([
        addAuthors([data]),
        addMediaUrls(data.media ?? []),
      ]);
      return { ...data, author: author[0].author, media: signedMedia };
    },

    async getThread(id: string) {
      const thread = await getThreadRow(id);
      // TODO(integration): record the thread-read signal through createFeedApi(ctx) when available.
      const { data: posts, error } = await supabase
        .from("thread_posts")
        .select("id, thread_id, author_id, body, media, created_at")
        .eq("thread_id", id)
        .eq("hidden", false)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(100);
      if (error) throw error;
      const [threadAuthor, threadMedia, postAuthors, postMedia] = await Promise.all([
        addAuthors([thread]),
        addMediaUrls(thread.media ?? []),
        addAuthors(posts ?? []),
        Promise.all(
          (posts ?? []).map(async (post) => ({
            ...post,
            media: await addMediaUrls(post.media ?? []),
          })),
        ),
      ]);
      const authorByPost = new Map(postAuthors.map((post) => [post.id, post.author]));
      return {
        ...thread,
        author: threadAuthor[0].author,
        media: threadMedia,
        posts: postMedia.map((post) => ({ ...post, author: authorByPost.get(post.id) ?? null })),
      };
    },

    async addPost(userId: string, threadId: string, input: AddPostInput) {
      assertOwnedMedia(userId, input.media);
      await getThreadRow(threadId);
      const { data, error } = await supabase
        .from("thread_posts")
        .insert({ thread_id: threadId, author_id: userId, body: input.body, media: input.media })
        .select("id, thread_id, author_id, body, media, created_at")
        .single();
      if (error) throw error;
      // TODO(integration): classify this reply and record its thread-engagement signal through feed.
      const [authors, signedMedia] = await Promise.all([
        addAuthors([data]),
        addMediaUrls(data.media ?? []),
      ]);
      return { ...data, author: authors[0].author, media: signedMedia };
    },

    async signMedia(userId: string, input: SignMediaInput) {
      const extension = input.file_name.split(".").at(-1)?.toLowerCase();
      if (!extension || !mediaExtensions[input.content_type].includes(extension)) {
        throw new AppError(
          400,
          "INVALID_FILE_TYPE",
          "Ekstensi file tidak sesuai dengan tipe media",
        );
      }
      const path = `${userId}/community/${randomUUID()}.${extension}`;
      const { data, error } = await media().createSignedUploadUrl(path, { upsert: false });
      if (error) throw error;
      return { path: data.path, token: data.token, signedUrl: data.signedUrl };
    },

    async createReport(userId: string, input: CreateReportInput) {
      await checkRateLimit("content_reports", userId, contentReportLimitPerHour);
      await reportTargetExists(input);
      const { data, error } = await supabase
        .from("content_reports")
        .insert({
          reporter_id: userId,
          target_type: input.target_type,
          target_id: input.target_id,
          reason: input.reason,
        })
        .select("id, reporter_id, target_type, target_id, reason, status, created_at")
        .single();
      if (error?.code === "23505") {
        throw new AppError(409, "DUPLICATE_REPORT", "Kamu sudah melaporkan konten ini");
      }
      if (error) throw error;
      return data;
    },

    async listReports(input: ListReportsInput) {
      const cursor = decodeCursor(input.cursor);
      let query = supabase
        .from("content_reports")
        .select("id, reporter_id, target_type, target_id, reason, status, resolved_by, created_at")
        .eq("status", input.status)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(input.limit + 1);
      if (cursor) {
        query = query.or(
          `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      const rows = data ?? [];
      const hasMore = rows.length > input.limit;
      const page = rows.slice(0, input.limit);
      const reporterProfiles = await accounts.getProfileSummaries([
        ...new Set(page.map((item) => item.reporter_id)),
      ]);
      const reporterById = new Map(reporterProfiles.map((profile) => [profile.id, profile]));
      const withTargets = await Promise.all(
        page.map(async (report) => {
          const targetResult =
            report.target_type === "thread"
              ? await supabase
                  .from("threads")
                  .select("id, author_id, title, body, media, hidden")
                  .eq("id", report.target_id)
                  .maybeSingle()
              : await supabase
                  .from("thread_posts")
                  .select("id, thread_id, author_id, body, media, hidden")
                  .eq("id", report.target_id)
                  .maybeSingle();
          const { data: target, error: targetError } = targetResult;
          if (targetError) throw targetError;
          if (!target)
            return {
              ...report,
              reporter: reporterById.get(report.reporter_id) ?? null,
              target: null,
            };
          const targetAuthor = await accounts.getProfileSummary(target.author_id);
          const mediaItems = target.media ?? [];
          return {
            ...report,
            reporter: reporterById.get(report.reporter_id) ?? null,
            target: { ...target, author: targetAuthor, media: await addMediaUrls(mediaItems) },
          };
        }),
      );
      const last = page.at(-1);
      return {
        items: withTargets,
        next_cursor:
          hasMore && last ? encodeCursor({ created_at: last.created_at, id: last.id }) : null,
      };
    },

    async resolveReport(adminId: string, reportId: string, input: ResolveReportInput) {
      const { data: report, error: findError } = await supabase
        .from("content_reports")
        .select("id, target_type, target_id, status")
        .eq("id", reportId)
        .eq("status", "open")
        .maybeSingle();
      if (findError) throw findError;
      if (!report) throw notFound("OPEN_REPORT_NOT_FOUND", "Laporan terbuka tidak ditemukan");

      const { data: updated, error: updateError } = await supabase
        .from("content_reports")
        .update({ status: input.status, resolved_by: adminId })
        .eq("id", reportId)
        .eq("status", "open")
        .select("id, reporter_id, target_type, target_id, reason, status, resolved_by, created_at")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) throw new AppError(409, "REPORT_ALREADY_RESOLVED", "Laporan sudah ditindak");

      if (input.hide_content) {
        const table = report.target_type === "thread" ? "threads" : "thread_posts";
        const { data: hidden, error: hideError } = await supabase
          .from(table)
          .update({ hidden: true })
          .eq("id", report.target_id)
          .select("id")
          .maybeSingle();
        if (hideError || !hidden) {
          const { error: rollbackError } = await supabase
            .from("content_reports")
            .update({ status: "open", resolved_by: null })
            .eq("id", reportId)
            .eq("status", input.status);
          if (rollbackError) throw rollbackError;
          if (hideError) throw hideError;
          throw notFound("CONTENT_NOT_FOUND", "Konten tidak ditemukan");
        }
      }
      return updated;
    },

    async countOpenReports() {
      const { count, error } = await supabase
        .from("content_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");
      if (error) throw error;
      return count ?? 0;
    },
  };
}

export type CommunityService = ReturnType<typeof createCommunityService>;
