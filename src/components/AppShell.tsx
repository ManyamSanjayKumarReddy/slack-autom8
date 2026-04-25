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
  User as UserIcon,
} from "lucide-react";
import { SlackIcon } from "@/components/SlackIcon";
import { clearToken } from "@/lib/auth";
import { useCurrentUser, clearCachedUser } from "@/lib/user-store";
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

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={[
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 no-underline",
        active
          ? "bg-white/10 text-white shadow-sm"
          : "text-[#94a3b8] hover:bg-white/6 hover:text-[#cbd5e1]",
      ].join(" ")}
    >
      <Icon
        className="h-4 w-4 shrink-0 transition-opacity"
        style={{ opacity: active ? 1 : 0.65 }}
      />
      <span className="truncate">{item.label}</span>
      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
      )}
    </Link>
  );
}

function SidebarInner({
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
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className="px-5 py-5 flex items-center justify-between gap-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Link to="/dashboard" className="flex items-center gap-3 no-underline group">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
              boxShadow: "0 4px 14px rgba(139,92,246,0.5)",
            }}
          >
            <SlackIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[14px] font-bold leading-tight tracking-tight text-[#f1f5f9]">
              Slack Autom8
            </div>
            <div className="text-[11px] leading-tight text-[#64748b]">AI Summarizer</div>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-[#64748b] hover:text-[#94a3b8] hover:bg-white/6 transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <div className="px-3 pb-2.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#475569]">
          Navigation
        </div>
        {items.map((item) => {
          const active =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + "/");
          return <NavLink key={item.to} item={item} active={active} />;
        })}
      </nav>

      {/* User section */}
      <div className="p-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <Link
          to="/profile"
          className="flex items-center gap-3 rounded-xl p-3 no-underline transition-all hover:bg-white/6 mb-1"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-[#f1f5f9] truncate">{displayName}</div>
            <div className="text-[11px] text-[#64748b] truncate">
              {role ? (ROLE_LABELS[role] ?? role) : ""}
            </div>
          </div>
          <UserIcon className="h-3.5 w-3.5 text-[#475569] shrink-0" />
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#64748b] hover:text-[#94a3b8] hover:bg-white/6 transition-all text-left"
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <LogOut className="h-4 w-4 shrink-0 opacity-70" />
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
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

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
      {/* Desktop sidebar — always dark */}
      <aside
        className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen z-20"
        style={{
          background: "#0f0e1a",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.2)",
        }}
      >
        <SidebarInner
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
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      {open && (
        <aside
          className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col animate-in slide-in-from-left duration-200"
          style={{
            background: "#0f0e1a",
            borderRight: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <SidebarInner
            items={items}
            displayName={displayName}
            initial={initial}
            role={role}
            onLogout={handleLogout}
            onClose={() => setOpen(false)}
          />
        </aside>
      )}

      {/* Content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 h-14 border-b border-border"
          style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
              >
                <SlackIcon className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-bold text-foreground">Slack Autom8</span>
            </div>
          </div>
          <Link
            to="/profile"
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
            aria-label="Profile"
          >
            {initial}
          </Link>
        </header>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className={`mx-auto ${maxWidth} px-4 sm:px-6 lg:px-8 py-8 sm:py-10`}>
            {(title || subtitle) && (
              <div className="mb-8">
                {title && (
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1.5 text-sm sm:text-base text-muted-foreground">{subtitle}</p>
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
