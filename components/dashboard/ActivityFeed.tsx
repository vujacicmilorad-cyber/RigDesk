"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ActivityLog } from "@/types/database";

type Item = ActivityLog & {
  profiles?: { name: string } | null;
};

export function ActivityFeed({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const [live, setLive] = useState(false);
  const [mode, setMode] = useState<"realtime" | "poll" | "static">("static");

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  useEffect(() => {
    const supabase = createClient();
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function refresh() {
      const { data } = await supabase
        .from("activity_log")
        .select("*, profiles(name)")
        .order("created_at", { ascending: false })
        .limit(12);
      if (data) setItems(data as Item[]);
    }

    const channel = supabase
      .channel("activity-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        () => {
          setLive(true);
          setMode("realtime");
          void refresh();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setMode("realtime");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setMode("poll");
          pollTimer = setInterval(() => void refresh(), 8000);
        }
      });

    // Fallback poll if Realtime never confirms within 3s
    const fallback = setTimeout(() => {
      setMode((m) => {
        if (m === "static") {
          pollTimer = setInterval(() => void refresh(), 8000);
          return "poll";
        }
        return m;
      });
    }, 3000);

    return () => {
      clearTimeout(fallback);
      if (pollTimer) clearInterval(pollTimer);
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section className="panel bg-surface border border-line rounded-[10px]">
      <div className="panel-h flex justify-between items-baseline px-[18px] pt-3.5 pb-2">
        <h2>Team activity</h2>
        <small className="text-muted">
          {mode === "realtime"
            ? live
              ? "live"
              : "realtime ready"
            : mode === "poll"
              ? "refreshing"
              : "who entered what"}
        </small>
      </div>
      <ul className="list-none m-0 px-2 pb-2">
        {items.length === 0 ? (
          <li className="px-2.5 py-3 text-muted text-sm">
            No activity yet. Saves from the team will show up here.
          </li>
        ) : (
          items.map((l) => (
            <li
              key={l.id}
              className="flex gap-3 items-start px-2.5 py-2 rounded-lg"
            >
              <span className="tick flex-none w-[18px] h-[18px] mt-0.5 rounded-full bg-sign-soft text-sign grid place-items-center text-[11px] font-bold font-display">
                {(l.profiles?.name ?? "?").charAt(0)}
              </span>
              <span className="flex-1 min-w-0">
                <b>{l.profiles?.name ?? "Team"}</b> {l.action}
              </span>
              <time className="text-muted text-[12.5px] whitespace-nowrap pl-2">
                {new Date(l.created_at).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
