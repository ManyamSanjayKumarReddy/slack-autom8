import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  GitBranch,
  UserCog,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { SlackIcon } from "@/components/SlackIcon";
import { clearToken } from "@/lib/auth";
import { useCurrentUser, clearCachedUser } from "@/lib/user-store";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/roles";
import { isOneOf } from "@/lib/roles";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  allowed: Role[];
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, allowed: ["employee", "team_lead", "manager", "admin"] },
  { to: "/projects", label: "Projects", icon: FolderKanban, allowed: ["employee", "team_lead", "manager", "admin"] },
  { to: "/hierarchy", label: "Summary Report", icon: GitBranch, allowed: ["manager", "admin"] },
  { to: "/admin/users", label: "User Management", icon: UserCog, allowed: ["admin"] },
];

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  team_lead: "Team Lead",
  manager: "Manager",
  admin: "Admin",
};

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-150 no-underline relative",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1",
        active
          ? "bg-indigo-50 text-indigo-700 font-semibold"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-indigo-500" />
      )}
      <Icon
        className={cn("h-[17px] w-[17px] shrink-0 transition-colors", active ? "text-indigo-500" : "text-slate-400")}
      />
      <span className="truncate">{item.label}</span>
      {active && (
        <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 text-indigo-500 opacity-60" />
      )}
    </Link>
  );
}

function SidebarContent({
  items,
  displayName,
  initial,
  role,
  onLogout,
  onClose,
}: {
  items: NavItem[];
  displayName: string;
  initial: string;
  role: Role | undefined;
  onLogout: () => void;
  onClose?: () => void;
}) {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* ── Logo ── */}
      <div className="px-5 py-4 flex items-center justify-between gap-3 shrink-0 border-b border-slate-100">
        <Link to="/dashboard" className="flex items-center gap-3 no-underline group">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
            }}
          >
            <SlackIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[14px] font-extrabold leading-tight tracking-tight text-slate-900" style={{ letterSpacing: "-0.02em" }}>
              Slack Autom8
            </div>
            <div className="text-[11px] leading-tight font-medium text-slate-400">
              AI Summarizer
            </div>
          </div>
        </Link>

        {onClose && (
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <div className="px-3 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-slate-400">
          Navigation
        </div>
        {items.map((item) => {
          const active =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + "/");
          return (
            <NavLink key={item.to} item={item} active={active} onClick={onClose} />
          );
        })}
      </nav>

      {/* ── User card + logout ── */}
      <div className="p-3 shrink-0 space-y-1 border-t border-slate-100">
        <Link
          to="/profile"
          className="flex items-center gap-3 rounded-xl p-3 no-underline transition-colors bg-slate-50 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold truncate text-slate-900">
              {displayName}
            </div>
            <div className="text-[11px] truncate text-slate-500">
              {role ? (ROLE_LABELS[role] ?? role) : ""}
            </div>
          </div>
        </Link>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors text-left text-slate-500 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}

export function AppShell({
  title,
  subtitle,
  children,
  maxWidth = "max-w-6xl",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const role = user?.role;
  const items = NAV.filter((n) => (role ? isOneOf(role, n.allowed) : false));

  const handleLogout = () => {
    clearToken();
    clearCachedUser();
    navigate({ to: "/" });
  };

  const displayName = user?.name || user?.email || "there";
  const initial = (displayName?.[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-[240px] shrink-0 sticky top-0 h-screen z-20"
        style={{ boxShadow: "var(--shadow-sidebar)" }}
      >
        <SidebarContent
          items={items}
          displayName={displayName}
          initial={initial}
          role={role}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-200"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      {open && (
        <aside
          className="lg:hidden fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col animate-in slide-in-from-left duration-200"
          style={{ boxShadow: "var(--shadow-elevated)" }}
        >
          <SidebarContent
            items={items}
            displayName={displayName}
            initial={initial}
            role={role}
            onLogout={handleLogout}
            onClose={() => setOpen(false)}
          />
        </aside>
      )}

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 h-[56px] border-b border-slate-200"
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-md flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
              >
                <SlackIcon className="h-3.5 w-3.5" />
              </div>
              <span
                className="text-[14px] font-extrabold text-slate-900"
                style={{ letterSpacing: "-0.02em" }}
              >
                Slack Autom8
              </span>
            </div>
          </div>
          <Link
            to="/profile"
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
            aria-label="Profile"
          >
            {initial}
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0">
          <div className={`mx-auto ${maxWidth} px-5 sm:px-8 py-8 sm:py-10`}>
            {(title || subtitle) && (
              <div className="mb-8">
                {title && (
                  <h1
                    className="text-[26px] sm:text-[30px] font-extrabold tracking-tight text-slate-900"
                    style={{ letterSpacing: "-0.025em" }}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1.5 text-[14px] text-slate-500">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
