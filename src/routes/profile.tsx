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
        <div
          className="rounded-2xl p-16 text-center"
          style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#64748b" }}
        >
          Loading…
        </div>
      ) : user ? (
        <div className="space-y-8">
          {/* Profile banner — matches dashboard/projects indigo style */}
          <div
            className="rounded-2xl px-8 py-7 relative overflow-hidden border"
            style={{
              background: "linear-gradient(135deg, #eef2ff 0%, #f5f7ff 55%, #f6f8fc 100%)",
              borderColor: "#e0e7ff",
            }}
          >
            <div
              className="absolute right-[-40px] top-[-50px] h-[200px] w-[200px] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)" }}
            />
            <div className="relative flex items-center gap-5 flex-wrap">
              {/* Avatar */}
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-extrabold text-white shrink-0"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                  boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
                }}
              >
                {initials(user.name, user.email)}
              </div>
              <div className="flex-1 min-w-0">
                <h1
                  className="font-extrabold mb-0.5"
                  style={{ fontSize: "22px", color: "#0f172a", letterSpacing: "-0.025em" }}
                >
                  {user.name || "Unnamed user"}
                </h1>
                <p style={{ fontSize: "14px", color: "#64748b" }}>{user.email}</p>
              </div>
              <RoleBadge role={user.role} />
            </div>
          </div>

          {/* Account details */}
          <div
            className="rounded-2xl bg-white overflow-hidden"
            style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <h2 className="font-bold" style={{ fontSize: "13.5px", color: "#0f172a" }}>Account details</h2>
            </div>
            <dl className="divide-y" style={{ borderColor: "#f1f5f9" }}>
              {[
                { label: "User ID", value: <span className="font-mono text-xs break-all">{user.id}</span> },
                { label: "Display name", value: user.name || "—" },
                { label: "Email", value: user.email || "—" },
                { label: "Workspace role", value: <RoleBadge role={user.role} size="xs" /> },
              ].map(({ label, value }) => (
                <div key={label} className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start">
                  <dt style={{ fontSize: "13.5px", color: "#64748b", fontWeight: 500 }}>{label}</dt>
                  <dd className="sm:col-span-2" style={{ fontSize: "13.5px", color: "#0f172a" }}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Project memberships */}
          <div
            className="rounded-2xl bg-white overflow-hidden"
            style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <h2 className="font-bold" style={{ fontSize: "13.5px", color: "#0f172a" }}>
                  Project memberships
                  {memberships && (
                    <span className="ml-2 font-normal" style={{ fontSize: "12px", color: "#94a3b8" }}>
                      ({memberships.length})
                    </span>
                  )}
                </h2>
              </div>
              <Link
                to="/projects"
                className="inline-flex items-center gap-1 no-underline shrink-0 hover:opacity-80 transition-opacity"
                style={{ fontSize: "12px", fontWeight: 600, color: "#6366f1" }}
              >
                Browse projects
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loading ? (
              <div className="p-10 text-center" style={{ fontSize: "14px", color: "#64748b" }}>Loading…</div>
            ) : !memberships || memberships.length === 0 ? (
              <div className="p-12 text-center">
                <FolderKanban className="h-8 w-8 mx-auto mb-3" style={{ color: "#cbd5e1" }} />
                <p style={{ fontSize: "13.5px", color: "#94a3b8" }}>Not a member of any projects yet.</p>
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: "#f1f5f9" }}>
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
                        style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 2px 6px ${from}40` }}
                      >
                        {initials2}
                      </div>
                      <Link
                        to="/projects/$projectId"
                        params={{ projectId: m.project_id }}
                        className="truncate flex-1 no-underline transition-colors hover:text-indigo-600"
                        style={{ fontSize: "13.5px", fontWeight: 500, color: "#0f172a" }}
                      >
                        {m.project_name}
                      </Link>
                      {m.joined_at && (
                        <span className="hidden sm:inline-flex items-center gap-1 shrink-0" style={{ fontSize: "12px", color: "#94a3b8" }}>
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
        <div
          className="rounded-2xl p-16 text-center"
          style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#64748b" }}
        >
          Could not load profile.
        </div>
      )}
    </AppShell>
  );
}
