import { requireProfile } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { SignedInAs } from "@/components/layout/SignedInAs";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, supabase } = await requireProfile();

  const [{ data: prepTrucks }, { count: leadsNew }, { data: lateKeys }] =
    await Promise.all([
      supabase.from("trucks").select("id").eq("status", "in_prep"),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      supabase.from("key_log").select("taken_at").is("returned_at", null),
    ]);

  let prepOpen = 0;
  if (prepTrucks && prepTrucks.length > 0) {
    const { count } = await supabase
      .from("prep_steps")
      .select("id", { count: "exact", head: true })
      .eq("done", false)
      .in(
        "truck_id",
        prepTrucks.map((t) => t.id),
      );
    prepOpen = count ?? 0;
  }

  const keysLate = (lateKeys ?? []).filter(
    (k) =>
      Date.now() - new Date(k.taken_at).getTime() > 24 * 60 * 60 * 1000,
  ).length;

  const badges: Record<string, number> = {};
  if (prepOpen) badges["/prep"] = prepOpen;
  if (leadsNew) badges["/leads"] = leadsNew;
  if (keysLate) badges["/keys"] = keysLate;

  return (
    <div className="app grid grid-rows-[1fr_auto] lg:grid-rows-1 lg:grid-cols-[216px_1fr] min-h-[100dvh]">
      <div className="order-2 lg:order-1">
        <Sidebar profile={profile} badges={badges} />
      </div>
      <main className="main order-1 lg:order-2 min-h-0 overflow-auto overflow-x-hidden p-[18px_14px_28px] md:p-[22px_22px_36px] lg:p-[26px_30px_60px]">
        <SignedInAs profile={profile} />
        {children}
      </main>
    </div>
  );
}
