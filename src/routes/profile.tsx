import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch, clearToken, isAuthenticated } from "@/lib/auth";
import { SlackIcon } from "@/components/SlackIcon";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: ProfilePage,
});

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TrackedChannel {
  channel_id: string;
  channel_name: string;
  is_active: boolean;
  created_at: string;
}

function initials(name?: string, email?: string): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase() || source[0].toUpperCase();
}

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [channels, setChannels] = useState<TrackedChannel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Profile — Slack Summarizer";
    let cancelled = false;
    (async () => {
      try {
        const [meRes, chRes] = await Promise.all([
          apiFetch("/users/me"),
          apiFetch("/users/me/channels?page=1&page_size=200"),
        ]);
        if (!cancelled && meRes.ok) {
          setUser((await meRes.json()) as UserInfo);
        }
        if (!cancelled && chRes.ok) {
          const data = (await chRes.json()) as
            | { total: number; results: TrackedChannel[] }
            | { total: number; channels: TrackedChannel[] };
          const list =
            "results" in data ? data.results : "channels" in data ? data.channels : [];
          setChannels(list ?? []);
        }
        if (!meRes.ok) setError("Failed to load profile");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-accent flex items-center justify-center">
              <SlackIcon className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight text-foreground truncate">Slack Summarizer</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link
              to="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Profile</h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">Your account and workspace details.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <section className="rounded-2xl border border-border bg-card p-16 text-center text-muted-foreground shadow-[var(--shadow-card)]">
            Loading…
          </section>
        ) : user ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
              <div className="px-6 py-6 sm:px-8 sm:py-8 flex items-center gap-5">
                <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center text-lg font-semibold text-foreground">
                  {initials(user.name, user.email)}
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-semibold text-foreground truncate">
                    {user.name || "Unnamed user"}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                  <div className="mt-2 inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground capitalize">
                    {user.role}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Account details</h2>
              </div>
              <dl className="divide-y divide-border">
                <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  <dt className="text-sm text-muted-foreground">User ID</dt>
                  <dd className="sm:col-span-2 text-sm text-foreground font-mono break-all">
                    {user.id}
                  </dd>
                </div>
                <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  <dt className="text-sm text-muted-foreground">Name</dt>
                  <dd className="sm:col-span-2 text-sm text-foreground break-words">{user.name || "—"}</dd>
                </div>
                <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  <dt className="text-sm text-muted-foreground">Email</dt>
                  <dd className="sm:col-span-2 text-sm text-foreground break-all">{user.email || "—"}</dd>
                </div>
                <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  <dt className="text-sm text-muted-foreground">Role</dt>
                  <dd className="sm:col-span-2 text-sm text-foreground capitalize">{user.role}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Tracked channels ({channels?.length ?? 0})
                </h2>
                <Link
                  to="/onboarding"
                  className="text-sm font-medium text-primary hover:underline shrink-0"
                >
                  Manage
                </Link>
              </div>
              {!channels || channels.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No channels tracked yet.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {channels.map((c) => (
                    <li key={c.channel_id} className="px-4 sm:px-6 py-3 flex items-center gap-3">
                      <span className="text-muted-foreground shrink-0">#</span>
                      <span className="text-sm text-foreground truncate">{c.channel_name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-16 text-center text-muted-foreground shadow-[var(--shadow-card)]">
            Could not load profile.
          </section>
        )}
      </main>
    </div>
  );
}
