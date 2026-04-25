import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  FolderKanban,
  FileText,
  Sparkles,
  PenLine,
  Hash,
  Users as UsersIcon,
  User as UserIcon,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { apiFetch, isAuthenticated, setToken } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/user-store";
import { useProjects, type Project } from "@/lib/projects-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setToken(token);
      window.history.replaceState({}, "", "/dashboard");
      return;
    }
    if (!isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: DashboardPage,
});

const ROLE_GREETINGS: Record<string, string> = {
  employee: "Here's what's happening across your projects.",
  team_lead: "Here's your team activity at a glance.",
  manager: "Here's your workspace overview.",
  admin: "Here's your full workspace at a glance.",
};

/* Deterministic color for project avatar based on name */
const PROJECT_GRADIENTS = [
  ["#8b5cf6", "#6366f1"],
  ["#3b82f6", "#2563eb"],
  ["#10b981", "#0d9488"],
  ["#f59e0b", "#d97706"],
  ["#ec4899", "#db2777"],
  ["#14b8a6", "#0891b2"],
  ["#f97316", "#ea580c"],
  ["#84cc16", "#16a34a"],
];

function projectColor(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PROJECT_GRADIENTS[hash % PROJECT_GRADIENTS.length];
}

function DashboardPage() {
  const { user } = useCurrentUser();
  const { projects, loading } = useProjects();
  const role = user?.role;
  const showStats = role === "manager" || role === "admin";

  useEffect(() => {
    document.title = "Dashboard — Slack Autom8";
  }, []);

  const displayName = (user?.name || user?.email || "there").split(" ")[0];
  const subtitle = role ? (ROLE_GREETINGS[role] ?? "Welcome back.") : "Welcome back.";

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Welcome banner — light indigo gradient */}
        <div
          className="rounded-2xl px-7 py-6 relative overflow-hidden border"
          style={{
            background: "linear-gradient(135deg, #eef2ff 0%, #f5f7ff 60%, #f6f8fc 100%)",
            borderColor: "#e0e7ff",
          }}
        >
          {/* Subtle decorative ring */}
          <div
            className="absolute right-[-60px] top-[-60px] h-[220px] w-[220px] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
            }}
          />
          <div className="relative">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.1em] mb-2"
              style={{ color: "#6366f1" }}
            >
              Dashboard
            </p>
            <h1
              className="text-[22px] sm:text-[26px] font-extrabold mb-1.5"
              style={{ color: "#0f172a", letterSpacing: "-0.025em" }}
            >
              Good to see you, {displayName}!
            </h1>
            <p className="text-[14px]" style={{ color: "#64748b" }}>{subtitle}</p>
          </div>
        </div>

        {showStats && <DashboardStats role={role} />}

        {/* Projects section */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2
                className="font-bold"
                style={{ fontSize: "17px", color: "#0f172a", letterSpacing: "-0.02em" }}
              >
                Your projects
              </h2>
              <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                Jump into any project below
              </p>
            </div>
            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 font-semibold hover:opacity-75 transition-opacity no-underline"
              style={{ fontSize: "13px", color: "#6366f1" }}
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-2xl" />
              ))}
            </div>
          ) : !projects || projects.length === 0 ? (
            <div
              className="rounded-2xl p-14 text-center bg-white"
              style={{ border: "2px dashed #e2e8f0" }}
            >
              <FolderKanban className="h-10 w-10 mx-auto mb-3" style={{ color: "#cbd5e1" }} />
              <p className="font-semibold mb-1" style={{ fontSize: "14px", color: "#334155" }}>
                No projects yet
              </p>
              <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                {role === "admin"
                  ? 'Head to "Projects" to create your first one.'
                  : "You haven't been added to any projects yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.slice(0, 6).map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const [from, to] = projectColor(project.name);
  const initials = project.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="group rounded-2xl bg-card border border-border p-5 flex flex-col gap-4 transition-all hover:-translate-y-0.5 hover:shadow-lg no-underline"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          {project.my_role && (
            <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0.5">
              {project.my_role === "team_lead" ? "Team Lead" : "Member"}
            </Badge>
          )}
        </div>
      </div>

      {project.description ? (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground italic">No description provided.</p>
      )}

      <div
        className="flex items-center gap-4 pt-3 mt-auto"
        style={{ borderTop: "1px solid #e2e8f0", color: "#94a3b8", fontSize: "12px" }}
      >
        <span className="inline-flex items-center gap-1.5">
          <UsersIcon className="h-3.5 w-3.5" />
          <span className="font-semibold" style={{ color: "#334155" }}>{project.member_count ?? 0}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Hash className="h-3.5 w-3.5" />
          <span className="font-semibold" style={{ color: "#334155" }}>{project.channel_count ?? 0}</span>
        </span>
        <span className="ml-auto truncate" style={{ fontSize: "11px" }}>
          {project.manager_name ? (
            <span className="font-medium" style={{ color: "#334155" }}>{project.manager_name}</span>
          ) : (
            <span className="italic" style={{ color: "#94a3b8" }}>Unassigned</span>
          )}
        </span>
      </div>
    </Link>
  );
}

interface AdminStats {
  total_users?: number;
  total_members?: number;
  total_projects?: number;
  total_teams?: number;
  total_summaries?: number;
  total_personal_summaries?: number;
  total_project_summaries?: number;
  personal_summaries?: number;
  project_summaries?: number;
  auto_generated_personal?: number;
  auto_generated_project?: number;
  manual_personal?: number;
  manual_project?: number;
  auto_summaries?: number;
  manual_summaries?: number;
}

interface StatCard {
  label: string;
  value: number | undefined;
  icon: typeof Users;
  from: string;
  to: string;
  iconColor: string;
}

function StatCard({ card, loading }: { card: StatCard; loading: boolean }) {
  const Icon = card.icon;
  return (
    <div
      className="rounded-2xl bg-white border p-5 flex flex-col gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{
        borderColor: "#e2e8f0",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 3px 12px rgba(0,0,0,0.05)",
      }}
    >
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: `${card.from}18`,
          border: `1px solid ${card.from}28`,
        }}
      >
        <Icon className="h-4.5 w-4.5" style={{ color: card.iconColor, width: 18, height: 18 }} />
      </div>
      <div>
        <div
          className="font-extrabold leading-none"
          style={{ fontSize: "26px", color: "#0f172a", letterSpacing: "-0.03em" }}
        >
          {loading ? (
            <span className="inline-block h-7 w-10 rounded-lg animate-pulse" style={{ background: "#f1f5f9" }} />
          ) : (
            (card.value ?? 0).toLocaleString()
          )}
        </div>
        <div className="mt-1.5 font-medium" style={{ fontSize: "12px", color: "#64748b" }}>
          {card.label}
        </div>
      </div>
    </div>
  );
}

function DashboardStats({ role }: { role: "admin" | "manager" }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/admin/stats");
        if (!res.ok) return;
        const data = (await res.json()) as AdminStats;
        if (!cancelled) setStats(data);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const personal = stats?.total_personal_summaries ?? stats?.personal_summaries ?? 0;
  const projectS = stats?.total_project_summaries ?? stats?.project_summaries ?? 0;
  const totalSummaries = stats?.total_summaries ?? personal + projectS;
  const autoTotal =
    stats?.auto_summaries ??
    (stats?.auto_generated_personal ?? 0) + (stats?.auto_generated_project ?? 0);
  const manualTotal =
    stats?.manual_summaries ??
    (stats?.manual_personal ?? 0) + (stats?.manual_project ?? 0);

  const cards: StatCard[] = [
    {
      label: role === "admin" ? "Total Users" : "Total Members",
      value: role === "admin" ? stats?.total_users : (stats?.total_members ?? stats?.total_users),
      icon: Users,
      from: "#8b5cf6",
      to: "#6366f1",
      iconColor: "#8b5cf6",
    },
    {
      label: "Total Projects",
      value: stats?.total_projects ?? stats?.total_teams,
      icon: FolderKanban,
      from: "#3b82f6",
      to: "#2563eb",
      iconColor: "#3b82f6",
    },
    {
      label: "Total Summaries",
      value: totalSummaries,
      icon: FileText,
      from: "#f59e0b",
      to: "#d97706",
      iconColor: "#f59e0b",
    },
    {
      label: "Personal Summaries",
      value: personal,
      icon: UserIcon,
      from: "#10b981",
      to: "#0d9488",
      iconColor: "#10b981",
    },
    {
      label: "Project Summaries",
      value: projectS,
      icon: FolderKanban,
      from: "#14b8a6",
      to: "#0891b2",
      iconColor: "#14b8a6",
    },
    {
      label: "Auto Generated",
      value: autoTotal,
      icon: Sparkles,
      from: "#a855f7",
      to: "#9333ea",
      iconColor: "#a855f7",
    },
    {
      label: "Manual",
      value: manualTotal,
      icon: PenLine,
      from: "#ec4899",
      to: "#db2777",
      iconColor: "#ec4899",
    },
  ];

  return (
    <section>
      <h2
        className="font-bold mb-5"
        style={{ fontSize: "17px", color: "#0f172a", letterSpacing: "-0.02em" }}
      >
        Workspace stats
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        {cards.map((c) => (
          <StatCard key={c.label} card={c} loading={loading} />
        ))}
      </div>
    </section>
  );
}
