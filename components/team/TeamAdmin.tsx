"use client";

import { useState, useTransition } from "react";
import {
  inviteOrToggleUserAction,
  saveRepGoalAction,
  inviteUserAction,
} from "@/lib/actions/phase3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/types/database";

export function TeamAdmin({
  people,
  reps,
  goals,
}: {
  people: Profile[];
  reps: Profile[];
  goals: { sales_rep_id: string; target_units: number; target_profit: number }[];
}) {
  const [pending, start] = useTransition();
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const month = new Date().toISOString().slice(0, 7);

  return (
    <section className="panel bg-surface border border-line rounded-[10px] mt-[18px] p-[14px_18px]">
      <h2 className="mb-3">Owner tools</h2>

      <div className="bg-amber-soft border border-amber rounded-[10px] p-3 mb-4 text-sm">
        <b>Adding a teammate.</b> Prefer the Supabase Dashboard → Authentication →
        Add user (email + password), then insert a matching row in{" "}
        <code className="text-[13px]">profiles</code> with the same UUID, name and
        role. Or try the form below (needs{" "}
        <code className="text-[13px]">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
        <code className="text-[13px]">.env.local</code>).
      </div>

      <form
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 items-end mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setInviteMsg(null);
          setInviteErr(null);
          start(async () => {
            const res = await inviteUserAction(fd);
            if (res.error) setInviteErr(res.error);
            else {
              setInviteMsg(res.message ?? "User created.");
              e.currentTarget.reset();
            }
          });
        }}
      >
        <div>
          <Label htmlFor="invite_email">Email</Label>
          <Input
            id="invite_email"
            name="email"
            type="email"
            required
            placeholder="name@magnum.local"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="invite_name">Name</Label>
          <Input id="invite_name" name="name" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="invite_role">Role</Label>
          <select
            id="invite_role"
            name="role"
            className="mt-1 flex h-10 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 text-sm"
            defaultValue="sales"
          >
            <option value="sales">Sales</option>
            <option value="mechanic">Mechanic</option>
            <option value="office">Office</option>
            <option value="owner">Owner</option>
          </select>
        </div>
        <div>
          <Label htmlFor="invite_password">Temp password</Label>
          <Input
            id="invite_password"
            name="password"
            type="text"
            required
            minLength={8}
            defaultValue="magnum123"
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2 md:col-span-4 flex gap-2 items-center flex-wrap">
          <Button type="submit" disabled={pending}>
            {pending ? "Working…" : "Create login + profile"}
          </Button>
          {inviteMsg && <span className="text-sm text-sign">{inviteMsg}</span>}
          {inviteErr && (
            <span className="text-sm text-red" role="alert">
              {inviteErr}
            </span>
          )}
        </div>
      </form>

      <h3 className="font-display text-xl mb-2">Active / inactive</h3>
      <div className="space-y-2 mb-6">
        {people.map((p) => (
          <div
            key={p.id}
            className="flex justify-between items-center gap-3 border-b border-line py-2"
          >
            <span>
              <b>{p.name}</b>{" "}
              <span className="text-muted text-sm">{p.role}</span>
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const fd = new FormData();
                  fd.set("user_id", p.id);
                  fd.set("active", p.active ? "false" : "true");
                  await inviteOrToggleUserAction(fd);
                })
              }
            >
              {p.active ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        ))}
      </div>

      <h3 className="font-display text-xl mb-2">Rep goals ({month})</h3>
      <div className="space-y-4">
        {reps.map((r) => {
          const g = goals.find((x) => x.sales_rep_id === r.id);
          return (
            <form
              key={r.id}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 items-end"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                start(async () => {
                  await saveRepGoalAction(fd);
                });
              }}
            >
              <input type="hidden" name="sales_rep_id" value={r.id} />
              <input type="hidden" name="month" value={month} />
              <div className="col-span-2 md:col-span-1">
                <Label>{r.name}</Label>
              </div>
              <div>
                <Label htmlFor={`u-${r.id}`}>Units</Label>
                <Input
                  id={`u-${r.id}`}
                  name="target_units"
                  type="number"
                  min={0}
                  defaultValue={g?.target_units ?? 3}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`p-${r.id}`}>Profit $</Label>
                <Input
                  id={`p-${r.id}`}
                  name="target_profit"
                  type="number"
                  min={0}
                  defaultValue={g?.target_profit ?? 30000}
                  className="mt-1"
                />
              </div>
              <Button type="submit" size="sm" disabled={pending}>
                Save
              </Button>
            </form>
          );
        })}
      </div>
    </section>
  );
}
