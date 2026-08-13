import { supabase } from "./cloudSync";

export const APP_VERSION = "2.25.3";

export interface UsageBreakdown { label: string; count: number }
export interface AdminStats {
  registeredUsers: number;
  trackedUsers: number;
  activeToday: number;
  active7Days: number;
  active30Days: number;
  standaloneUsers: number;
  totalLaunches: number;
  versions: UsageBreakdown[];
  languages: UsageBreakdown[];
  generatedAt: string;
}

export async function recordUsage(language: "ja" | "en"): Promise<void> {
  const standalone = window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  const { error } = await supabase.rpc("record_shoot_log_usage", {
    p_app_version: APP_VERSION,
    p_language: language,
    p_display_mode: standalone ? "standalone" : "browser",
  });
  if (error && error.code !== "PGRST202") throw error;
}

export async function checkAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_shoot_log_admin");
  if (error) {
    if (error.code === "PGRST202") return false;
    throw error;
  }
  return data === true;
}

export async function loadAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc("get_shoot_log_admin_stats");
  if (error) throw error;
  return data as AdminStats;
}
