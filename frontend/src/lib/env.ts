export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appMode: process.env.NEXT_PUBLIC_APP_MODE ?? "production",
  yoloServiceUrl: process.env.NEXT_PUBLIC_YOLO_SERVICE_URL ?? "http://localhost:8000",
};
