import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  FolderKanban,
  FileText,
  Sparkles,
  Hash,
  Users as UsersIcon,
  User as UserIcon,
  ArrowRight,
  Plus,
  Hourglass,
  Zap,
} from "lucide-react";
import { apiFetch, isAuthenticated, setToken } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/user-store";
import { useProjects, type Project } from "@/lib/projects-store";
import { projectColor, projectInitials } from "@/lib/project-colors";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type OnboardingAction =
  | "create_project"
  | "wait_for_project_assignment"
  | "add_channels"
  | "wait_for_channels"
  | "add_team_members"
  | "generate_first_summary"
  | null;

interface OnboardingStatus {
  next_action: OnboardingAction;
}

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


function DashboardPage() {
  const { user } = useCurrentUser();
  const { projects, loading } = useProjects();
  const role = user?.role;
  const showStats = role === "manager" || role === "admin";
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);

  useEffect(() => {
    document.title = "Dashboard — Slack Autom8";
    apiFetch("/users/me/onboarding-status")
      .then(async (res) => { if (res.ok) setOnboarding(await res.json()); })
      .catch(() => {});
  }, []);

  const displayName = (user?.name || user?.email || "there").split(" ")[0];
  const subtitle = role ? (ROLE_GREETINGS[role] ?? "Welcome back.") : "Welcome back.";

  return (
    <AppShell title="Home">
      <div className="space-y-8">
        {/* Welcome banner */}
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
          <div className="absolute right-[60px] bottom-[-30px] h-[120px] w-[120px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)" }}
          />
          <div className="relative">
            <h1
              className="text-[24px] sm:text-[28px] font-extrabold mb-1.5"
              style={{ color: "var(--banner-heading-color)", letterSpacing: "-0.025em" }}
            >
              Good to see you, {displayName}! 👋
            </h1>
            <p style={{ fontSize: "15px", color: "var(--banner-subtitle-color)" }}>{subtitle}</p>
          </div>
        </div>

        {showStats && <DashboardStats role={role} />}

        {/* Projects section */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2
                className="font-bold"
                style={{ fontSize: "18px", color: "var(--color-foreground)", letterSpacing: "-0.02em" }}
              >
                Your projects
              </h2>
              <p style={{ fontSize: "13px", color: "var(--color-muted-foreground)", marginTop: "3px" }}>
                Jump into any project below
              </p>
            </div>
            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 font-semibold hover:opacity-75 transition-opacity no-underline"
              style={{ fontSize: "13px", color: "#1264a3" }}
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-44 w-full rounded-2xl" />
              ))}
            </div>
          ) : !projects || projects.length === 0 ? (
            <OnboardingEmptyState action={onboarding?.next_action ?? null} role={role} />

          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.slice(0, 6).map((p) => (
                <ProjectCard key={p.slug} project={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

const ONBOARDING_STEPS: Record<
  NonNullable<OnboardingAction>,
  { icon: typeof FolderKanban; title: string; body: string; cta?: { label: string; to: string } }
> = {
  create_project: {
    icon: FolderKanban,
    title: "Create your first project",
    body: "Set up a project to start tracking Slack channel activity and generating AI summaries.",
    cta: { label: "Go to Projects", to: "/projects" },
  },
  wait_for_project_assignment: {
    icon: Hourglass,
    title: "Waiting for project access",
    body: "You haven't been assigned to any project yet. Ask your admin to add you to a project.",
  },
  add_channels: {
    icon: Hash,
    title: "Add Slack channels",
    body: "Your project is ready — now add the Slack channels you want to track for summaries.",
    cta: { label: "Go to Projects", to: "/projects" },
  },
  wait_for_channels: {
    icon: Hourglass,
    title: "Waiting for channels",
    body: "Your project has no Slack channels yet. Ask a team lead or admin to add channels.",
  },
  add_team_members: {
    icon: UsersIcon,
    title: "Invite team members",
    body: "Channels are configured — now add team members so everyone gets their personalized summaries.",
    cta: { label: "Go to Projects", to: "/projects" },
  },
  generate_first_summary: {
    icon: Zap,
    title: "Ready! Generate your first summary",
    body: "Everything is set up. Open a project and generate your first summary to see it in action.",
    cta: { label: "Go to Projects", to: "/projects" },
  },
};

function OnboardingEmptyState({ action, role }: { action: OnboardingAction; role?: string }) {
  const step = action ? ONBOARDING_STEPS[action] : null;
  const Icon = step?.icon ?? FolderKanban;
  const title = step?.title ?? (role === "admin" ? "No projects yet" : "No projects yet");
  const body =
    step?.body ??
    (role === "admin"
      ? "Create your first project to start tracking Slack summaries."
      : "You haven't been added to any projects yet. Ask your admin to add you.");
  const cta = step?.cta;

  return (
    <div
      className="rounded-2xl p-12 text-center bg-card"
      style={{ border: "2px dashed var(--color-border)" }}
    >
      <Icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
      <p className="font-semibold mb-1 text-foreground" style={{ fontSize: "15px" }}>
        {title}
      </p>
      <p className="mb-5 text-muted-foreground" style={{ fontSize: "13px" }}>
        {body}
      </p>
      {cta && (
        <Link
          to={cta.to}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold no-underline transition-opacity hover:opacity-80"
          style={{ background: "#1264a3", color: "#fff" }}
        >
          <Plus className="h-4 w-4" />
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const [from, to] = projectColor(project.name);
  const initials = projectInitials(project.name);

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.slug }}
      className="group rounded-2xl bg-card flex flex-col gap-4 transition-all hover:-translate-y-0.5 hover:shadow-lg no-underline overflow-hidden border border-border"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)",
      }}
    >
      {/* Coloured top strip */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />

      <div className="px-5 pb-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start gap-3.5">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center text-white text-sm font-extrabold shrink-0"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 4px 10px ${from}40` }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3
              className="font-bold truncate transition-colors text-foreground"
              style={{ fontSize: "15px" }}
            >
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
          <p
            className="line-clamp-2 leading-relaxed flex-1 text-muted-foreground"
            style={{ fontSize: "13px" }}
          >
            {project.description}
          </p>
        ) : (
          <p className="italic flex-1 text-muted-foreground/60" style={{ fontSize: "13px" }}>
            No description provided.
          </p>
        )}

        <div
          className="flex items-center gap-4 pt-3 border-t border-border text-muted-foreground"
          style={{ fontSize: "12px" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <UsersIcon className="h-3.5 w-3.5" />
            <span className="font-semibold text-foreground">
              {project.member_count ?? 0}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            <span className="font-semibold text-foreground">
              {project.channel_count ?? 0}
            </span>
          </span>
          <span className="ml-auto truncate" style={{ fontSize: "11px" }}>
            {project.manager_name ? (
              <span className="font-medium text-muted-foreground">
                {project.manager_name}
              </span>
            ) : (
              <span className="italic text-muted-foreground/60">
                Unassigned
              </span>
            )}
          </span>
        </div>
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
  auto_summaries?: number;
}

interface StatCardData {
  label: string;
  value: number | undefined;
  icon: typeof Users;
  color: string;
  gradientFrom: string;
  gradientTo: string;
}

function StatCard({ card, loading }: { card: StatCardData; loading: boolean }) {
  const Icon = card.icon;
  return (
    <div
      className="rounded-2xl bg-card flex flex-col gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md overflow-hidden relative"
      style={{
        background: `linear-gradient(145deg, ${card.gradientFrom}20 0%, ${card.gradientFrom}08 50%, transparent 100%)`,
        border: `1px solid ${card.gradientFrom}28`,
        boxShadow: `0 1px 3px rgba(0,0,0,0.04), 0 4px 16px ${card.gradientFrom}12`,
      }}
    >
      {/* Decorative gradient orb */}
      <div
        className="absolute top-[-20px] right-[-20px] h-[80px] w-[80px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${card.gradientFrom}22 0%, transparent 70%)` }}
      />
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center relative"
        style={{
          background: `linear-gradient(135deg, ${card.gradientFrom}28, ${card.gradientTo}18)`,
          border: `1px solid ${card.gradientFrom}30`,
        }}
      >
        <Icon style={{ color: card.color, width: 18, height: 18 }} />
      </div>
      <div className="relative">
        <div
          className="font-extrabold leading-none text-foreground"
          style={{ fontSize: "28px", letterSpacing: "-0.03em" }}
        >
          {loading ? (
            <span className="inline-block h-7 w-10 rounded-lg animate-pulse bg-muted" />
          ) : (
            (card.value ?? 0).toLocaleString()
          )}
        </div>
        <div className="mt-1.5 font-medium text-muted-foreground" style={{ fontSize: "12px" }}>
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

  const cards: StatCardData[] = [
    {
      label: role === "admin" ? "Total Users" : "Total Members",
      value: role === "admin" ? stats?.total_users : (stats?.total_members ?? stats?.total_users),
      icon: Users,
      color: "#8b5cf6",
      gradientFrom: "#8b5cf6",
      gradientTo: "#1264a3",
    },
    {
      label: "Total Projects",
      value: stats?.total_projects ?? stats?.total_teams,
      icon: FolderKanban,
      color: "#3b82f6",
      gradientFrom: "#3b82f6",
      gradientTo: "#2563eb",
    },
    {
      label: "Total Summaries",
      value: totalSummaries,
      icon: FileText,
      color: "#f59e0b",
      gradientFrom: "#f59e0b",
      gradientTo: "#d97706",
    },
    {
      label: "Personal",
      value: personal,
      icon: UserIcon,
      color: "#10b981",
      gradientFrom: "#10b981",
      gradientTo: "#0d9488",
    },
    {
      label: "Project",
      value: projectS,
      icon: FolderKanban,
      color: "#14b8a6",
      gradientFrom: "#14b8a6",
      gradientTo: "#0891b2",
    },
    {
      label: "Auto Generated",
      value: autoTotal,
      icon: Sparkles,
      color: "#a855f7",
      gradientFrom: "#a855f7",
      gradientTo: "#9333ea",
    },
  ];

  return (
    <section>
      <h2
        className="font-bold mb-5 text-foreground"
        style={{ fontSize: "18px", letterSpacing: "-0.02em" }}
      >
        Workspace stats
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <StatCard key={c.label} card={c} loading={loading} />
        ))}
      </div>
    </section>
  );
}
