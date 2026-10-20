"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  markArrivedAction,
  publishListingAction,
} from "@/lib/actions/prep";
import { Button } from "@/components/ui/button";

export function PrepActions({
  truckId,
  status,
  prepDone,
}: {
  truckId: string;
  status: string;
  prepDone: number;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="actions flex gap-2.5 flex-wrap mt-4">
      {status === "incoming" && (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await markArrivedAction(truckId);
            })
          }
        >
          Mark as arrived
        </Button>
      )}
      {status === "in_prep" && (
        <Button
          type="button"
          size="sm"
          disabled={pending || prepDone < 5}
          onClick={() =>
            start(async () => {
              await publishListingAction(truckId);
            })
          }
        >
          Publish listing
        </Button>
      )}
      <Button asChild variant="outline" size="sm">
        <Link href={`/trucks/${truckId}`}>Open truck</Link>
      </Button>
    </div>
  );
}
