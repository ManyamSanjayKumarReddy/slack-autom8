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

const ROLE_SUBTITLES: Record<string, string> = {
  employee: "Your projects and recent activity.",
  manager: "Projects you manage at a glance.",
  admin: "Workspace-wide projects and stats.",
};

function DashboardPage() {
  const { user } = useCurrentUser();
  const { projects, loading } = useProjects();
  const role = user?.role;
  const showStats = role === "manager" || role === "admin";

  useEffect(() => {
    document.title = "Dashboard — Slack Summarizer";
  }, []);

  const displayName = user?.name || user?.email || "there";
  const subtitle = role
    ? ROLE_SUBTITLES[role] ?? "Welcome back."
    : "Welcome back.";

  return (
    <AppShell title={`Welcome back, ${displayName}`} subtitle={subtitle}>
      <div className="space-y-6">
        {showStats && <DashboardStats />}

        <section>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-base font-semibold text-foreground">
              Your projects
            </h2>
            <Link
              to="/projects"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-36 w-full rounded-2xl" />
              ))}
            </div>
          ) : !projects || projects.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-[var(--shadow-card)]">
              {role === "admin"
                ? 'No projects yet. Head to "Projects" to create one.'
                : "You haven't been added to any projects yet."}
            </section>
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
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="group rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {project.name}
        </h3>
        {project.my_role && (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {project.my_role === "team_lead" ? "Team Lead" : "Member"}
          </Badge>
        )}
      </div>
      {project.description ? (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {project.description}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground italic">No description</p>
      )}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
        <span className="inline-flex items-center gap-1">
          <UsersIcon className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">
            {project.member_count ?? 0}
          </span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Hash className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">
            {project.channel_count ?? 0}
          </span>
        </span>
        <span className="ml-auto truncate">
          {project.manager_name ? (
            <span className="text-foreground">{project.manager_name}</span>
          ) : (
            <span className="italic">Unassigned</span>
          )}
        </span>
      </div>
    </Link>
  );
}

interface AdminStats {
  total_users?: number;
  total_projects?: number;
  total_teams?: number; // legacy fallback
  total_summaries?: number;
  personal_summaries?: number;
  project_summaries?: number;
  auto_summaries?: number;
  manual_summaries?: number;
}

function DashboardStats() {
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
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      label: "Total Users",
      value: stats?.total_users,
      icon: Users,
      gradient: "from-violet-500/15 via-fuchsia-500/10 to-transparent",
      iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    },
    {
      label: "Total Projects",
      value: stats?.total_projects ?? stats?.total_teams,
      icon: FolderKanban,
      gradient: "from-sky-500/15 via-cyan-500/10 to-transparent",
      iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    },
    {
      label: "Total Summaries",
      value: stats?.total_summaries,
      icon: FileText,
      gradient: "from-amber-500/15 via-orange-500/10 to-transparent",
      iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    },
    {
      label: "Auto Generated",
      value: stats?.auto_summaries,
      icon: Sparkles,
      gradient: "from-emerald-500/15 via-teal-500/10 to-transparent",
      iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    },
    {
      label: "Manual",
      value: stats?.manual_summaries,
      icon: PenLine,
      gradient: "from-rose-500/15 via-pink-500/10 to-transparent",
      iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-80`}
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className="text-3xl sm:text-4xl font-bold leading-none tracking-tight"
                  style={{ color: "#4A154B" }}
                >
                  {loading ? (
                    <span className="inline-block h-7 w-10 rounded-md bg-muted-foreground/20 animate-pulse" />
                  ) : (
                    (c.value ?? 0)
                  )}
                </div>
                <div className="mt-2 text-xs sm:text-sm text-muted-foreground font-medium">
                  {c.label}
                </div>
              </div>
              <div
                className={`shrink-0 inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl ${c.iconBg} ring-1 ring-inset ring-black/5`}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
