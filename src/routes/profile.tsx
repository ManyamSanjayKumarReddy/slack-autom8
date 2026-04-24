import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { RoleBadge } from "@/components/RoleBadge";
import { useCurrentUser } from "@/lib/user-store";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: ProfilePage,
});

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
  const { user, loading: userLoading } = useCurrentUser();
  const [channels, setChannels] = useState<TrackedChannel[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Profile — Slack Summarizer";
    let cancelled = false;
    (async () => {
      try {
        const chRes = await apiFetch("/users/me/channels?page=1&page_size=200");
        if (!cancelled && chRes.ok) {
          const data = (await chRes.json()) as
            | { total: number; results: TrackedChannel[] }
            | { total: number; channels: TrackedChannel[] };
          const list =
            "results" in data ? data.results : "channels" in data ? data.channels : [];
          setChannels(list ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell title="Profile" subtitle="Your account and workspace details." maxWidth="max-w-4xl">
      {userLoading || loading ? (
        <section className="rounded-2xl border border-border bg-card p-16 text-center text-muted-foreground shadow-[var(--shadow-card)]">
          Loading…
        </section>
      ) : user ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-6 py-6 sm:px-8 sm:py-8 flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center text-lg font-semibold text-foreground shrink-0">
                {initials(user.name, user.email)}
              </div>
              <div className="min-w-0">
                <div className="text-xl font-semibold text-foreground truncate">
                  {user.name || "Unnamed user"}
                </div>
                <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                <div className="mt-2">
                  <RoleBadge role={user.role} />
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
                <dd className="sm:col-span-2 text-sm text-foreground break-words">
                  {user.name || "—"}
                </dd>
              </div>
              <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="sm:col-span-2 text-sm text-foreground break-all">
                  {user.email || "—"}
                </dd>
              </div>
              <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                <dt className="text-sm text-muted-foreground">Role</dt>
                <dd className="sm:col-span-2 text-sm text-foreground">
                  <RoleBadge role={user.role} size="xs" />
                </dd>
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
    </AppShell>
  );
}
