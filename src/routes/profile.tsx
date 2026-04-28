import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { RoleBadge } from "@/components/RoleBadge";
import { useCurrentUser } from "@/lib/user-store";
import { projectColor, projectInitials } from "@/lib/project-colors";
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
        <div
          className="rounded-2xl p-16 text-center bg-card border border-border text-muted-foreground"
        >
          Loading…
        </div>
      ) : user ? (
        <div className="space-y-8">
          {/* Profile banner — matches dashboard/projects indigo style */}
          <div
            className="rounded-2xl px-5 sm:px-8 py-5 sm:py-7 relative overflow-hidden border"
            style={{
              background: "var(--banner-bg)",
              borderColor: "var(--banner-border)",
            }}
          >
            <div
              className="absolute right-[-40px] top-[-50px] h-[200px] w-[200px] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(18,100,163,0.14) 0%, transparent 70%)" }}
            />
            <div className="relative flex items-center gap-5 flex-wrap">
              {/* Avatar */}
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-extrabold text-white shrink-0"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #1264a3 100%)",
                  boxShadow: "0 4px 14px rgba(18,100,163,0.4)",
                }}
              >
                {initials(user.name, user.email)}
              </div>
              <div className="flex-1 min-w-0">
                <h1
                  className="font-extrabold mb-0.5"
                  style={{
                    fontSize: "22px",
                    color: "var(--banner-heading-color)",
                    letterSpacing: "-0.025em",
                  }}
                >
                  {user.name || "Unnamed user"}
                </h1>
                <p style={{ fontSize: "14px", color: "var(--banner-subtitle-color)" }}>
                  {user.email}
                </p>
              </div>
              <RoleBadge role={user.role} />
            </div>
          </div>

          {/* Account details */}
          <div
            className="rounded-2xl bg-card overflow-hidden border border-border"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-bold text-foreground" style={{ fontSize: "13.5px" }}>Account details</h2>
            </div>
            <dl className="divide-y divide-border">
              {[
                { label: "User ID", value: <span className="font-mono text-xs break-all">{user.id}</span> },
                { label: "Display name", value: user.name || "—" },
                { label: "Email", value: user.email || "—" },
                { label: "Workspace role", value: <RoleBadge role={user.role} size="xs" /> },
              ].map(({ label, value }) => (
                <div key={label} className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <dt className="text-muted-foreground" style={{ fontSize: "13.5px", fontWeight: 500 }}>{label}</dt>
                  <dd className="sm:col-span-2 text-foreground" style={{ fontSize: "13.5px" }}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Project memberships */}
          <div
            className="rounded-2xl bg-card overflow-hidden border border-border"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="px-6 py-4 flex items-center justify-between gap-3 border-b border-border">
              <div>
                <h2 className="font-bold text-foreground" style={{ fontSize: "13.5px" }}>
                  Project memberships
                  {memberships && (
                    <span className="ml-2 font-normal text-muted-foreground" style={{ fontSize: "12px" }}>
                      ({memberships.length})
                    </span>
                  )}
                </h2>
              </div>
              <Link
                to="/projects"
                className="inline-flex items-center gap-1 no-underline shrink-0 hover:opacity-80 transition-opacity text-primary"
                style={{ fontSize: "12px", fontWeight: 600 }}
              >
                Browse projects
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loading ? (
              <div className="p-10 text-center text-muted-foreground" style={{ fontSize: "14px" }}>Loading…</div>
            ) : !memberships || memberships.length === 0 ? (
              <div className="p-12 text-center">
                <FolderKanban className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="mb-4 text-muted-foreground" style={{ fontSize: "13.5px" }}>Not a member of any projects yet.</p>
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold no-underline transition-opacity hover:opacity-80"
                  style={{
                    background: "var(--badge-team-bg)",
                    color: "var(--badge-team-color)",
                    border: "1px solid var(--banner-border)",
                  }}
                >
                  Browse projects
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {memberships.map((m) => {
                  const [from, to] = projectColor(m.project_name);
                  const initials2 = projectInitials(m.project_name);
                  return (
                    <li key={m.project_id} className="px-6 py-3.5 flex items-center gap-4">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 2px 6px ${from}40` }}
                      >
                        {initials2}
                      </div>
                      <Link
                        to="/projects/$projectId"
                        params={{ projectId: m.project_id }}
                        className="truncate flex-1 no-underline transition-colors hover:text-primary text-foreground"
                        style={{ fontSize: "13.5px", fontWeight: 500 }}
                      >
                        {m.project_name}
                      </Link>
                      {m.joined_at && (
                        <span className="hidden sm:inline-flex items-center gap-1 shrink-0 text-muted-foreground" style={{ fontSize: "12px" }}>
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
        <div className="rounded-2xl p-16 text-center bg-card border border-border text-muted-foreground">
          Could not load profile.
        </div>
      )}
    </AppShell>
  );
}
