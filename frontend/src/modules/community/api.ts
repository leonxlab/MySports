import { apiClient } from "@/lib/api-client";
import { env } from "@/lib/env";
import { getAccessToken } from "@/lib/supabase";
import type {
  CommunityMedia,
  CommunityPost,
  CommunityReport,
  CommunitySport,
  CommunityThread,
  ReportPage,
  SignedCommunityUpload,
  ThreadDetail,
  ThreadPage,
} from "./types";

const maximumMediaBytes = 50 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);

export const communityApi = {
  listThreads: (options: { sport?: CommunitySport; limit?: number; cursor?: string } = {}) =>
    apiClient.request<ThreadPage>("GET", "/community/threads", {
      query: options,
    }),

  createThread: (input: {
    sport: CommunitySport;
    title: string;
    body?: string;
    media: CommunityMedia[];
  }) => apiClient.request<CommunityThread>("POST", "/community/threads", { body: input }),

  getThread: (id: string) =>
    apiClient.request<ThreadDetail>("GET", "/community/threads/:id", { params: { id } }),

  addPost: (id: string, input: { body: string; media: CommunityMedia[] }) =>
    apiClient.request<CommunityPost>("POST", "/community/threads/:id/posts", {
      params: { id },
      body: input,
    }),

  signMediaUpload: (file: File) =>
    apiClient.request<SignedCommunityUpload>("POST", "/community/media/sign", {
      body: { file_name: file.name, content_type: file.type, file_size: file.size },
    }),

  async uploadMedia(file: File, onProgress: (progress: number) => void): Promise<CommunityMedia> {
    if (!allowedTypes.has(file.type)) throw new Error("Pilih JPG, PNG, WebP, MP4, atau WebM.");
    if (file.size === 0 || file.size > maximumMediaBytes) {
      throw new Error("Ukuran file harus lebih dari 0 dan maksimal 50 MB.");
    }

    const [signed, accessToken] = await Promise.all([this.signMediaUpload(file), getAccessToken()]);
    if (!accessToken) throw new Error("Sesi login berakhir. Silakan login kembali.");

    return new Promise<CommunityMedia>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("PUT", signed.signedUrl);
      request.setRequestHeader("apikey", env.supabaseAnonKey);
      request.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      request.setRequestHeader("x-upsert", "false");
      request.setRequestHeader("content-type", file.type);
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      request.onerror = () => reject(new Error("Unggahan gagal karena masalah jaringan."));
      request.onload = () => {
        if (request.status < 200 || request.status >= 300) {
          let message = `Storage menolak unggahan (${request.status}).`;
          try {
            const result = JSON.parse(request.responseText) as { message?: string };
            if (result.message) message = result.message;
          } catch {
            // Use the HTTP status when Storage returns a non-JSON response.
          }
          reject(new Error(message));
          return;
        }
        onProgress(100);
        resolve({
          type: file.type.startsWith("image/") ? "image" : "video",
          path: signed.path,
        });
      };
      request.send(file);
    });
  },

  reportContent: (input: { target_type: "thread" | "post"; target_id: string; reason: string }) =>
    apiClient.request<CommunityReport>("POST", "/community/reports", { body: input }),

  listReports: (
    options: {
      status?: CommunityReport["status"];
      limit?: number;
      cursor?: string;
    } = {},
  ) =>
    apiClient.request<ReportPage>("GET", "/community/reports", {
      query: options,
    }),

  resolveReport: (id: string, input: { status: "resolved" | "dismissed"; hide_content: boolean }) =>
    apiClient.request<CommunityReport>("POST", "/community/reports/:id/resolve", {
      params: { id },
      body: input,
    }),
};
