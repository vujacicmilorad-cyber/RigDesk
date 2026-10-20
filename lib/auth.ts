import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";
import { redirect } from "next/navigation";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function requireProfile(): Promise<{
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile || !profile.active) {
    redirect("/login?error=inactive");
  }

  return { profile: profile as Profile, supabase };
}

export async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  action: string,
  truckId?: string | null,
) {
  const { error } = await supabase.from("activity_log").insert({
    user_id: userId,
    truck_id: truckId ?? null,
    action,
  });
  if (error) {
    console.error("activity_log insert failed", error.message);
  }
}
