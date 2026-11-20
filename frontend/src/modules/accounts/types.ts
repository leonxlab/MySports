export type Role = "user" | "coach" | "owner" | "admin";
export type Sport = "basketball" | "badminton" | "tennis" | "padel" | "futsal";

export interface SportExperience {
  sport: Sport;
  years: number | null;
  notes: string | null;
}

export interface GalleryItem {
  id: string;
  kind: "photo" | "video" | "quote";
  storage_path: string | null;
  media_url: string | null;
  quote_text: string | null;
  created_at: string;
}

export interface ProfileSummary {
  id: string;
  display_name: string;
  photo_path: string | null;
  level: number;
}

export interface MeProfile {
  id: string;
  display_name: string;
  age: number | null;
  bio: string | null;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
  roles: Role[];
  level: number;
  photo_url?: string | null;
  experience: SportExperience[];
  gallery: GalleryItem[];
}

export type UpdateProfileInput = Partial<
  Pick<MeProfile, "display_name" | "age" | "bio" | "photo_path">
>;
