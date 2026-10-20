import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-[100dvh] bg-paper flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-surface border border-line rounded-[10px] p-5 sm:p-8">
        <div className="mb-6">
          <h1 className="text-sign">RigDesk</h1>
          <p className="sub text-muted mt-1">
            Magnum Truck Sales — sign in to work the lot and the office from the
            same numbers.
          </p>
        </div>
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
