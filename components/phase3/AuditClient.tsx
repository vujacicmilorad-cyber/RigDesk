"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeAuditSessionAction,
  scanAuditVinAction,
  startAuditSessionAction,
} from "@/lib/actions/phase3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuditClient({
  activeSessionId,
  scanCount,
}: {
  activeSessionId: string | null;
  scanCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [vin, setVin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(activeSessionId);

  return (
    <div className="panel bg-surface border border-line rounded-[10px] p-[14px_18px] space-y-3">
      {!sessionId ? (
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await startAuditSessionAction();
              if (res.id) setSessionId(res.id);
              if (res.error) setMessage(res.error);
              router.refresh();
            })
          }
        >
          Start lot audit
        </Button>
      ) : (
        <>
          <p className="text-sm text-muted">
            Session open · {scanCount} scans. Type or paste each VIN as you walk
            the lot.
          </p>
          <form
            className="flex gap-2 flex-wrap"
            onSubmit={(e) => {
              e.preventDefault();
              const v = vin;
              setMessage(null);
              start(async () => {
                const res = await scanAuditVinAction(sessionId, v);
                if (res.error) setMessage(res.error);
                else {
                  setMessage(res.matched ? "Matched inventory" : "Unknown VIN");
                  setVin("");
                  router.refresh();
                }
              });
            }}
          >
            <Input
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              placeholder="VIN"
              className="font-display tracking-wider max-w-md"
              autoFocus
            />
            <Button type="submit" disabled={pending || !vin}>
              Scan
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await completeAuditSessionAction(sessionId);
                  setSessionId(null);
                  router.refresh();
                })
              }
            >
              Complete audit
            </Button>
          </form>
          {message && <p className="text-sm text-muted">{message}</p>}
        </>
      )}
    </div>
  );
}
