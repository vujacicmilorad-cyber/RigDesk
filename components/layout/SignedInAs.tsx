"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import { roleLabel } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function SignedInAs({ profile }: { profile: Profile }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="whoami flex gap-2.5 items-center justify-between flex-wrap text-sm text-muted mb-4 pb-3.5 border-b border-line">
      <span className="min-w-0">
        <span className="lg:inline">Signed in as </span>
        <strong className="text-ink">{profile.name}</strong>
        <span className="text-muted"> · {roleLabel(profile.role)}</span>
      </span>
      <div className="flex gap-2 items-center">
        <ThemeToggle />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10"
          onClick={signOut}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
