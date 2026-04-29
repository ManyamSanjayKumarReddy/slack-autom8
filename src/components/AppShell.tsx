import { Link, useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  UserCog,
  Settings2,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  Hash,
  Plus,
  Search,
  Bell,
} from "lucide-react";
import { SlackIcon } from "@/components/SlackIcon";
import { clearToken } from "@/lib/auth";
import { useCurrentUser, clearCachedUser } from "@/lib/user-store";
import { useProjects } from "@/lib/projects-store";
import type { Role } from "@/lib/roles";
import { isOneOf } from "@/lib/roles";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  allowed: Role[];
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard, allowed: ["employee", "team_lead", "manager", "admin"] },
  { to: "/projects", label: "Projects", icon: FolderKanban, allowed: ["employee", "team_lead", "manager", "admin"] },
  { to: "/admin/users", label: "User Management", icon: UserCog, allowed: ["admin"] },
  { to: "/admin/settings", label: "Settings", icon: Settings2, allowed: ["admin"] },
];

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  team_lead: "Team Lead",
  manager: "Manager",
  admin: "Admin",
};

/* ───────────────────────── Workspace rail (col 1) ───────────────────────── */

function WorkspaceRail({
  items,
  onLogout,
}: {
  items: NavItem[];
  onLogout: () => void;
}) {
  const location = useLocation();

  return (
    <div
      className="hidden lg:flex flex-col items-center justify-between py-3 shrink-0"
      style={{ width: 64, background: "var(--slack-rail)", borderRight: "1px solid rgba(0,0,0,0.25)" }}
    >
      <div className="flex flex-col items-center gap-1.5">
        {/* Workspace badge */}
        <Link
          to="/dashboard"
          className="h-10 w-10 rounded-[9px] flex items-center justify-center no-underline transition-transform hover:scale-[1.04] mb-2"
          style={{
            background: "linear-gradient(135deg, #1264a3 0%, #0f5289 100%)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          }}
          aria-label="Slack Autom8"
        >
          <SlackIcon className="h-5 w-5" />
        </Link>

        {/* Nav icons — clean, icon-only, Slack-style */}
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className="group relative h-10 w-10 rounded-[9px] flex items-center justify-center no-underline transition-all duration-150"
              style={{
                background: active ? "rgba(255,255,255,0.16)" : "transparent",
                color: active ? "#ffffff" : "rgba(255,255,255,0.72)",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="h-[19px] w-[19px]" strokeWidth={2} />
              {/* Tooltip on hover */}
              <span
                className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-md text-[12px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50"
                style={{ background: "#1d1c1d", color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2.5">
        <button
          onClick={onLogout}
          className="h-9 w-9 rounded-[10px] flex items-center justify-center transition-colors"
          style={{ color: "var(--slack-rail-text)" }}
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="h-[17px] w-[17px]" />
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Channels column (col 2) ───────────────────────── */

interface ChannelsProps {
  workspaceName: string;
  displayName: string;
  role: Role | undefined;
  onCloseMobile?: () => void;
}

function ChannelsColumn({ workspaceName, displayName, role, onCloseMobile }: ChannelsProps) {
  const { projects, loading } = useProjects();
  const location = useLocation();
  const params = useParams({ strict: false }) as { projectId?: string };
  const activeProjectId = params.projectId;

  const [openProjects, setOpenProjects] = useState(true);
  const [openDirect, setOpenDirect] = useState(true);
  const [filter, setFilter] = useState("");

  const projectBase = "/projects";

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = projects ?? [];
    return q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list;
  }, [projects, filter]);

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--slack-channels)", color: "var(--slack-channels-text)" }}
    >
      {/* Workspace header */}
      <div
        className="flex items-center justify-between px-3.5 h-[56px] shrink-0"
        style={{ borderBottom: "1px solid var(--slack-divider)", boxShadow: "0 1px 0 rgba(0,0,0,0.15)" }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className="font-extrabold truncate"
            style={{ color: "var(--slack-channels-text-strong)", fontSize: "15.5px", letterSpacing: "-0.02em" }}
          >
            {workspaceName}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-3.5 w-3.5 opacity-80" />
          </button>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div
          className="flex items-center gap-2 rounded-md px-2.5 h-8 transition-colors"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <Search className="h-3.5 w-3.5 opacity-70" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Find a project"
            className="flex-1 bg-transparent text-[13px] placeholder:text-white/40 focus:outline-none"
            style={{ color: "var(--slack-channels-text-strong)" }}
          />
        </div>
      </div>

      {/* Section list */}
      <nav className="flex-1 overflow-y-auto px-1.5 pb-3 space-y-3 slack-scroll">
        {/* Quick actions */}
        <div className="space-y-0.5 mt-1">
          {NAV.filter((n) => (role ? isOneOf(role, n.allowed) : false)).slice(0, 1).map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className="flex items-center gap-2 px-3 h-7 rounded-md text-[13.5px] no-underline transition-colors"
                style={{
                  background: active ? "var(--slack-channels-active)" : "transparent",
                  color: active ? "#fff" : "var(--slack-channels-text)",
                  fontWeight: active ? 700 : 500,
                }}
              >
                <Icon className="h-[14px] w-[14px] opacity-90" />
                Home
              </Link>
            );
          })}
        </div>

        {/* Projects section (Slack "Channels") */}
        <div>
          <button
            type="button"
            onClick={() => setOpenProjects((v) => !v)}
            className="w-full flex items-center gap-1.5 px-2 h-7 rounded-md hover:bg-white/5 transition-colors group"
          >
            {openProjects ? (
              <ChevronDown className="h-3 w-3 opacity-70" />
            ) : (
              <ChevronRight className="h-3 w-3 opacity-70" />
            )}
            <span className="text-[13px] font-semibold tracking-tight opacity-90">Projects</span>
            <span className="ml-auto h-5 w-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10">
              <Plus className="h-3 w-3" />
            </span>
          </button>

          {openProjects && (
            <div className="mt-0.5 space-y-px">
              {loading && !projects ? (
                <div className="px-3 py-1 text-[12px] opacity-60">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-1 text-[12px] opacity-60">
                  {filter ? "No matches" : "No projects yet"}
                </div>
              ) : (
                filtered.map((p) => {
                  const isActive = activeProjectId === p.slug;
                  return (
                    <Link
                      key={p.slug}
                      to={`${projectBase}/$projectId`}
                      params={{ projectId: p.slug }}
                      onClick={onCloseMobile}
                      className="flex items-center gap-1.5 pl-6 pr-2 h-7 rounded-md text-[13.5px] no-underline transition-colors"
                      style={{
                        background: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                        color: isActive ? "#fff" : "var(--slack-channels-text)",
                        fontWeight: isActive ? 600 : 400,
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <Hash className="h-[13px] w-[13px] opacity-70 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Sections passthrough — second-tier nav */}
        <div>
          <button
            type="button"
            onClick={() => setOpenDirect((v) => !v)}
            className="w-full flex items-center gap-1.5 px-2 h-7 rounded-md hover:bg-white/5 transition-colors"
          >
            {openDirect ? (
              <ChevronDown className="h-3 w-3 opacity-70" />
            ) : (
              <ChevronRight className="h-3 w-3 opacity-70" />
            )}
            <span className="text-[13px] font-semibold tracking-tight opacity-90">Workspace</span>
          </button>
          {openDirect && (
            <div className="mt-0.5 space-y-px">
              {NAV.filter((n) => (role ? isOneOf(role, n.allowed) : false))
                .filter((n) => n.to !== "/dashboard" && n.to !== "/projects")
                .map((item) => {
                  const Icon = item.icon;
                  const active =
                    location.pathname === item.to ||
                    location.pathname.startsWith(item.to + "/");
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onCloseMobile}
                      className="flex items-center gap-2 pl-5 pr-2 h-7 rounded-md text-[13.5px] no-underline transition-colors"
                      style={{
                        background: active ? "var(--slack-channels-active)" : "transparent",
                        color: active ? "#fff" : "var(--slack-channels-text)",
                        fontWeight: active ? 700 : 500,
                      }}
                    >
                      <Icon className="h-[13.5px] w-[13.5px] opacity-90 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
            </div>
          )}
        </div>
      </nav>

      {/* Footer user card */}
      <Link
        to="/profile"
        onClick={onCloseMobile}
        className="shrink-0 flex items-center gap-2.5 px-3 py-2.5 no-underline transition-colors hover:bg-white/5"
        style={{ borderTop: "1px solid var(--slack-divider)" }}
      >
        <span className="relative">
          <span
            className="h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #1264a3, #0f5289)" }}
          >
            {(displayName?.[0] ?? "?").toUpperCase()}
          </span>
          <span
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
            style={{ background: "#22c55e", border: "2px solid var(--slack-channels)" }}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div
            className="text-[13px] font-semibold truncate"
            style={{ color: "var(--slack-channels-text-strong)" }}
          >
            {displayName}
          </div>
          <div className="text-[11px] truncate opacity-70">
            {role ? (ROLE_LABELS[role] ?? role) : ""}
          </div>
        </div>
      </Link>
    </div>
  );
}

/* ───────────────────────── Top header (col 3 chrome) ───────────────────────── */

function TopHeader({
  title,
  subtitle,
  onOpenMobile,
}: {
  title?: string;
  subtitle?: string;
  onOpenMobile: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 h-[56px] shrink-0"
      style={{
        background: "var(--topbar-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--topbar-border)",
      }}
    >
      <button
        type="button"
        onClick={onOpenMobile}
        className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        {title && (
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <Hash className="h-4 w-4 text-slate-400 shrink-0" />
            <h1
              className="font-extrabold truncate shrink-0 max-w-[200px] sm:max-w-xs text-slate-900 dark:text-white"
              style={{ fontSize: "15.5px", letterSpacing: "-0.01em" }}
            >
              {title}
            </h1>
            {subtitle && (
              <span className="hidden sm:inline text-[12.5px] text-slate-500 dark:text-slate-400 truncate min-w-0">· {subtitle}</span>
            )}
          </div>
        )}
      </div>

    </header>
  );
}

/* ───────────────────────── AppShell ───────────────────────── */

const RAIL_W = 64;
const CHANNELS_W = 260;

export function AppShell({
  title,
  subtitle,
  children,
  maxWidth,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Optional max width for content (e.g. "max-w-6xl"). Omit for Slack-style full-width left-aligned. */
  maxWidth?: string;
}) {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation();
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const role = user?.role;
  const items = NAV.filter((n) => (role ? isOneOf(role, n.allowed) : false));

  const handleLogout = () => {
    clearToken();
    clearCachedUser();
    navigate({ to: "/" });
  };

  const displayName = user?.name || user?.email || "there";

  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
      {/* ── Workspace rail (col 1, fixed) ── */}
      <div
        className="hidden lg:flex fixed inset-y-0 left-0 z-30"
        style={{ width: RAIL_W }}
      >
        <WorkspaceRail items={items} onLogout={handleLogout} />
      </div>

      {/* ── Channels column (col 2, fixed) ── */}
      <aside
        className="hidden lg:flex fixed inset-y-0 z-20"
        style={{ left: RAIL_W, width: CHANNELS_W, boxShadow: "var(--shadow-sidebar)" }}
      >
        <div className="w-full">
          <ChannelsColumn
            workspaceName="Slack Autom8"
            displayName={displayName}
            role={role}
          />
        </div>
      </aside>

      {/* ── Mobile drawer (rail + channels combined) ── */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="lg:hidden fixed inset-y-0 left-0 z-50 flex animate-in slide-in-from-left duration-200"
            style={{ width: RAIL_W + CHANNELS_W, maxWidth: "92vw" }}
          >
            <WorkspaceRail items={items} onLogout={handleLogout} />
            <div className="flex-1 min-w-0">
              <ChannelsColumn
                workspaceName="Slack Autom8"
                displayName={displayName}
                role={role}
                onCloseMobile={() => setMobileOpen(false)}
              />
            </div>
          </aside>
        </>
      )}

      {/* ── Main column (col 3) — Slack workspace pane ── */}
      <div className="flex-1 min-w-0 flex flex-col lg:ml-[324px]">
        <TopHeader
          title={title}
          subtitle={subtitle}
          onOpenMobile={() => setMobileOpen(true)}
        />

        {/* Slack-style workspace pane: full-width left-aligned content area */}
        <main className="flex-1 min-w-0" style={{ background: "var(--background)" }}>
          <div className="w-full px-5 sm:px-8 py-6 sm:py-7">
            {maxWidth ? (
              <div className={`mx-auto ${maxWidth}`}>{children}</div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
