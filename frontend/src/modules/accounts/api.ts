import { apiClient } from "@/lib/api-client";
import type { GalleryItem, MeProfile, Sport, SportExperience, UpdateProfileInput } from "./types";

export interface SignedUpload {
  path: string;
  token: string;
  signedUrl: string;
}

export interface UploadInput {
  file_name: string;
  content_type: string;
}

export type GalleryItemInput =
  | { kind: "photo" | "video"; storage_path: string }
  | { kind: "quote"; quote_text: string };

export const accountsApi = {
  bootstrapProfile: (displayName: string) =>
    apiClient.request<MeProfile>("POST", "/accounts/bootstrap", {
      body: { display_name: displayName },
    }),
  getMe: () => apiClient.request<MeProfile>("GET", "/accounts/me"),
  updateMe: (input: UpdateProfileInput) =>
    apiClient.request<MeProfile>("PATCH", "/accounts/me", { body: input }),
  getProfile: (id: string) =>
    apiClient.request<MeProfile>("GET", "/accounts/:id", { params: { id } }),
  upsertExperience: (sport: Sport, input: Partial<SportExperience>) =>
    apiClient.request<SportExperience>("PUT", "/accounts/me/experience/:sport", {
      params: { sport },
      body: input,
    }),
  signUpload: (input: UploadInput, purpose: "photo" | "gallery") =>
    apiClient.request<SignedUpload>(
      "POST",
      purpose === "photo" ? "/accounts/me/photo/sign" : "/accounts/me/gallery/sign",
      { body: input },
    ),
  addGalleryItem: (input: GalleryItemInput) =>
    apiClient.request<GalleryItem>("POST", "/accounts/me/gallery", { body: input }),
  removeGalleryItem: (itemId: string) =>
    apiClient.request<{ id: string; deleted: true }>("DELETE", "/accounts/me/gallery/:itemId", {
      params: { itemId },
    }),
};
