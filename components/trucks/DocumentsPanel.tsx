"use client";

import { useState, useTransition } from "react";
import {
  updateDocumentStatusAction,
  upsertDocumentAction,
} from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DOCUMENT_STATUS_LABEL,
  DOCUMENT_TYPE_LABEL,
  type DocumentRow,
  type DocumentStatus,
  type DocumentType,
} from "@/types/database";
import { cn } from "@/lib/utils";

const ALL_TYPES = Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[];
const ALL_STATUSES = Object.keys(DOCUMENT_STATUS_LABEL) as DocumentStatus[];

export function DocumentsPanel({
  truckId,
  docs,
  canWrite,
  publicUrlBase,
}: {
  truckId: string;
  docs: DocumentRow[];
  canWrite: boolean;
  publicUrlBase: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      {docs.length === 0 ? (
        <p className="text-muted">
          No documents on this truck yet.
          {canWrite ? " Add a report or title packet below." : ""}
        </p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap justify-between items-center gap-3 border border-line rounded-lg px-3 py-2.5"
            >
              <div className="min-w-0">
                <b>{DOCUMENT_TYPE_LABEL[d.type]}</b>
                {d.file_path && (
                  <span className="block text-sm text-muted">
                    File on record
                    {publicUrlBase ? (
                      <>
                        {" · "}
                        <a
                          href={`${publicUrlBase}/${d.file_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sign hover:underline"
                        >
                          open
                        </a>
                      </>
                    ) : null}
                  </span>
                )}
              </div>
              {canWrite ? (
                <select
                  className={cn(
                    "h-10 rounded-lg border-[1.5px] border-line bg-surface px-2 text-sm min-w-[160px]",
                  )}
                  defaultValue={d.status}
                  disabled={pending}
                  onChange={(e) => {
                    const status = e.target.value as DocumentStatus;
                    start(async () => {
                      const res = await updateDocumentStatusAction(d.id, status);
                      if (res.error) setError(res.error);
                    });
                  }}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {DOCUMENT_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-muted text-sm">
                  {DOCUMENT_STATUS_LABEL[d.status]}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-red text-sm" role="alert">
          {error}
        </p>
      )}

      {canWrite && !adding && (
        <Button type="button" variant="outline" onClick={() => setAdding(true)}>
          Add document
        </Button>
      )}

      {canWrite && adding && (
        <form
          className="border border-line rounded-[10px] p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("truck_id", truckId);
            setError(null);
            start(async () => {
              const res = await upsertDocumentAction(fd);
              if (res.error) setError(res.error);
              else {
                setAdding(false);
                e.currentTarget.reset();
              }
            });
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                required
                className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-sm"
                defaultValue="inspection_report"
              >
                {ALL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOCUMENT_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-sm"
                defaultValue="in_hand"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {DOCUMENT_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="file">File (optional)</Label>
              <Input id="file" name="file" type="file" className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
