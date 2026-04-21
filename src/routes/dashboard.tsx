import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch, clearToken, isAuthenticated } from "@/lib/auth";
import { SlackIcon } from "@/components/SlackIcon";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Slack Summarizer" },
      { name: "description", content: "Your Slack channel summaries." },
    ],
  }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: DashboardPage,
});

interface UserInfo {
  name?: string;
  display_name?: string;
  real_name?: string;
  email?: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/me");
        if (!res.ok) return;
        const data = (await res.json()) as UserInfo;
        if (!cancelled) setUser(data);
      } catch {
        // ignore — UI gracefully falls back
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    clearToken();
    navigate({ to: "/" });
  };

  const displayName =
    user?.display_name || user?.real_name || user?.name || user?.email || "there";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
              <SlackIcon className="h-4.5 w-4.5" />
            </div>
            <span className="font-semibold tracking-tight text-foreground">Slack Summarizer</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-muted-foreground">{displayName}</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {getGreeting()}, {displayName}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Here's an overview of your latest Slack summaries.
          </p>
        </div>

        <section className="rounded-2xl border border-dashed border-border bg-card p-16 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-primary"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="13" y2="17" />
            </svg>
          </div>
          <h2 className="mt-5 text-lg font-semibold text-foreground">No summaries yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Check back soon.</p>
        </section>
      </main>
    </div>
  );
}
