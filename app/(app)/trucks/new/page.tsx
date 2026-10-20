import { requireProfile } from "@/lib/auth";
import { canAddTruck, canSeeFinancials } from "@/lib/roles";
import { AddTruckForm } from "@/components/trucks/AddTruckForm";
import { redirect } from "next/navigation";

export default async function NewTruckPage() {
  const { profile } = await requireProfile();
  if (!canAddTruck(profile.role)) {
    redirect("/inventory");
  }

  return (
    <div>
      <div className="top mb-5">
        <h1>Add a truck</h1>
        <div className="sub text-muted mt-1">
          Scan the VIN, confirm the price, then add guided photos. About two
          minutes.
        </div>
      </div>
      <div className="panel bg-surface border border-line rounded-[10px] p-6">
        <AddTruckForm canSeeMoney={canSeeFinancials(profile.role)} />
      </div>
    </div>
  );
}
