import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { RoleBadge } from "@/components/RoleBadge";
import { useCurrentUser } from "@/lib/user-store";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, ArrowRight, Calendar } from "lucide-react";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: ProfilePage,
});

interface ProjectMembership {
  project_id: string;
  project_name: string;
  project_role: "employee" | "team_lead";
  joined_at?: string;
}

interface MyProjectsResponse {
  projects?: ProjectMembership[];
}

function initials(name?: string, email?: string): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase() || source[0].toUpperCase();
}

const PROJECT_GRADIENTS = [
  ["#8b5cf6", "#6366f1"],
  ["#3b82f6", "#2563eb"],
  ["#10b981", "#0d9488"],
  ["#f59e0b", "#d97706"],
  ["#ec4899", "#db2777"],
  ["#14b8a6", "#0891b2"],
];

function projectColor(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PROJECT_GRADIENTS[hash % PROJECT_GRADIENTS.length] as [string, string];
}

function ProfilePage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [memberships, setMemberships] = useState<ProjectMembership[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Profile — Slack Autom8";
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/users/me/projects`);
        if (!cancelled && res.ok) {
          const data = (await res.json()) as MyProjectsResponse;
          setMemberships(data.projects ?? []);
        } else if (!cancelled) {
          setMemberships([]);
        }
      } catch {
        if (!cancelled) setMemberships([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <AppShell maxWidth="max-w-3xl">
      {userLoading ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center text-muted-foreground" style={{ boxShadow: "var(--shadow-card)" }}>
          Loading…
        </div>
      ) : user ? (
        <div className="space-y-6">
          {/* Profile hero */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {/* Gradient header strip */}
            <div
              className="h-28 relative"
              style={{
                background: "linear-gradient(135deg, #0f0e1a 0%, #1a1035 50%, #0d1b3e 100%)",
              }}
            >
              <div
                className="absolute top-[-40px] right-[-20px] h-[200px] w-[200px] rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)",
                }}
              />
            </div>
            {/* Avatar + info */}
            <div className="bg-card px-6 pb-6 relative">
              <div
                className="h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white shrink-0 -mt-10 mb-4 ring-4 ring-card"
                style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
              >
                {initials(user.name, user.email)}
              </div>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    {user.name || "Unnamed user"}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
                </div>
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>

          {/* Account details */}
          <div
            className="rounded-2xl bg-card border border-border overflow-hidden"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">Account details</h2>
            </div>
            <dl className="divide-y divide-border">
              {[
                { label: "User ID", value: <span className="font-mono text-xs break-all">{user.id}</span> },
                { label: "Display name", value: user.name || "—" },
                { label: "Email", value: user.email || "—" },
                { label: "Workspace role", value: <RoleBadge role={user.role} size="xs" /> },
              ].map(({ label, value }) => (
                <div key={label} className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <dt className="text-sm text-muted-foreground font-medium">{label}</dt>
                  <dd className="sm:col-span-2 text-sm text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Project memberships */}
          <div
            className="rounded-2xl bg-card border border-border overflow-hidden"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Project memberships
                  {memberships && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({memberships.length})
                    </span>
                  )}
                </h2>
              </div>
              <Link
                to="/projects"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80 transition-opacity no-underline shrink-0"
              >
                Browse projects
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
            ) : !memberships || memberships.length === 0 ? (
              <div className="p-12 text-center">
                <FolderKanban className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">Not a member of any projects yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {memberships.map((m) => {
                  const [from, to] = projectColor(m.project_name);
                  const initials2 = m.project_name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase();
                  return (
                    <li key={m.project_id} className="px-6 py-3.5 flex items-center gap-4">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                      >
                        {initials2}
                      </div>
                      <Link
                        to="/projects/$projectId"
                        params={{ projectId: m.project_id }}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate flex-1 no-underline"
                      >
                        {m.project_name}
                      </Link>
                      {m.joined_at && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Calendar className="h-3 w-3" />
                          {new Date(m.joined_at).toLocaleDateString()}
                        </span>
                      )}
                      <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0.5">
                        {m.project_role === "team_lead" ? "Team Lead" : "Member"}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-16 text-center text-muted-foreground" style={{ boxShadow: "var(--shadow-card)" }}>
          Could not load profile.
        </div>
      )}
    </AppShell>
  );
}
