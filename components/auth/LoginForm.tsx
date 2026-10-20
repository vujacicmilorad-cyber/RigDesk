"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_USERS = [
  { email: "alex@magnum.local", label: "Alex · Owner" },
  { email: "ana@magnum.local", label: "Ana · Sales" },
  { email: "sam@magnum.local", label: "Sam · Sales" },
  { email: "mike@magnum.local", label: "Mike · Sales" },
  { email: "ray@magnum.local", label: "Ray · Mechanic" },
  { email: "tina@magnum.local", label: "Tina · Office" },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/today";
  const [email, setEmail] = useState("alex@magnum.local");
  const [password, setPassword] = useState("magnum123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md w-full">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 font-medium"
          required
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1"
          required
        />
      </div>
      {error && (
        <p className="text-sm text-red font-medium" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      <div className="pt-2">
        <p className="text-[13px] text-muted mb-2">
          Local seed accounts (password <code>magnum123</code>):
        </p>
        <div className="flex flex-wrap gap-2">
          {DEMO_USERS.map((u) => (
            <button
              key={u.email}
              type="button"
              className="chip text-xs"
              onClick={() => {
                setEmail(u.email);
                setPassword("magnum123");
              }}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
