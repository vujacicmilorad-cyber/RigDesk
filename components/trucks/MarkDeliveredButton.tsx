"use client";

import { useTransition } from "react";
import { markDeliveredAction } from "@/lib/actions/deals";
import { Button } from "@/components/ui/button";

export function MarkDeliveredButton({ truckId }: { truckId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="amber"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markDeliveredAction(truckId);
        })
      }
    >
      {pending ? "Saving…" : "Mark delivered"}
    </Button>
  );
}
