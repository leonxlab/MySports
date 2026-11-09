export type Role = "user" | "coach" | "owner" | "admin";

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
}
