"use client";

import { useState, useTransition } from "react";
import { uploadTruckPhotoAction } from "@/lib/actions/trucks";
import { PHOTO_SLOTS, type PhotoSlot, type TruckPhoto } from "@/types/database";
import { cn } from "@/lib/utils";

export function PhotoSlots({
  truckId,
  photos,
  publicUrlBase,
}: {
  truckId: string;
  photos: TruckPhoto[];
  publicUrlBase: string;
}) {
  const bySlot = new Map(photos.map((p) => [p.slot, p]));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onFile(slot: PhotoSlot, file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.set("truck_id", truckId);
    fd.set("slot", slot);
    fd.set("file", file);
    startTransition(async () => {
      const res = await uploadTruckPhotoAction(fd);
      if (res.error) setMessage(res.error);
      else setMessage("Photo saved");
    });
  }

  return (
    <div>
      <div className="shots grid grid-cols-3 md:grid-cols-5 gap-2 my-3.5">
        {PHOTO_SLOTS.map(({ slot, label }) => {
          const photo = bySlot.get(slot);
          const url = photo
            ? `${publicUrlBase}/${photo.file_path}`
            : null;
          return (
            <label
              key={slot}
              className={cn(
                "shot aspect-[4/3] rounded-lg border-[1.5px] border-dashed border-line grid place-items-center text-center text-[11.5px] text-muted p-1 leading-tight cursor-pointer overflow-hidden relative",
                photo && "border-solid border-sign bg-sign-soft text-ink font-semibold",
              )}
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={label}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                label
              )}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={pending}
                onChange={(e) => onFile(slot, e.target.files?.[0])}
              />
            </label>
          );
        })}
      </div>
      {message && <p className="text-sm text-muted">{message}</p>}
      {pending && <p className="text-sm text-muted">Uploading…</p>}
    </div>
  );
}
