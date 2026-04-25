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

/* Indigo palette constants so changes are centralised */
const INDIGO = {
  50: "#eef2ff",
  100: "#e0e7ff",
  500: "#6366f1",
  600: "#4f46e5",
  700: "#4338ca",
};
const SLATE = {
  50: "#f8fafc",
  100: "#f1f5f9",
  200: "#e2e8f0",
  400: "#94a3b8",
  500: "#64748b",
  700: "#334155",
  900: "#0f172a",
};

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-150 no-underline relative"
      style={
        active
          ? {
              background: INDIGO[50],
              color: INDIGO[700],
              fontWeight: 600,
            }
          : {
              color: SLATE[500],
            }
      }
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLAnchorElement).style.background = SLATE[50];
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
      }}
    >
      {/* Active left-bar indicator */}
      {active && (
        <span
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
          style={{ background: INDIGO[500] }}
        />
      )}
      <Icon
        className="h-[17px] w-[17px] shrink-0"
        style={{ color: active ? INDIGO[500] : SLATE[400] }}
      />
      <span className="truncate">{item.label}</span>
      {active && (
        <ChevronRight
          className="h-3.5 w-3.5 ml-auto shrink-0"
          style={{ color: INDIGO[500], opacity: 0.6 }}
        />
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
    <div
      className="flex flex-col h-full bg-white"
      style={{ borderRight: `1px solid ${SLATE[200]}` }}
    >
      {/* ── Logo ── */}
      <div
        className="px-5 py-4 flex items-center justify-between gap-3 shrink-0"
        style={{ borderBottom: `1px solid ${SLATE[100]}` }}
      >
        <Link to="/dashboard" className="flex items-center gap-3 no-underline group">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${INDIGO[500]} 0%, ${INDIGO[600]} 100%)`,
              boxShadow: `0 4px 12px ${INDIGO[500]}40`,
            }}
          >
            <SlackIcon className="h-5 w-5" />
          </div>
          <div>
            <div
              className="text-[14px] font-extrabold leading-tight tracking-tight"
              style={{ color: SLATE[900], letterSpacing: "-0.02em" }}
            >
              Slack Autom8
            </div>
            <div className="text-[11px] leading-tight font-medium" style={{ color: SLATE[400] }}>
              AI Summarizer
            </div>
          </div>
        </Link>

        {onClose && (
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: SLATE[400] }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = SLATE[100])}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <div
          className="px-3 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.09em]"
          style={{ color: SLATE[400] }}
        >
          Navigation
        </div>
        {items.map((item) => {
          const active =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + "/");
          return <NavLink key={item.to} item={item} active={active} />;
        })}
      </nav>

      {/* ── User card + logout ── */}
      <div
        className="p-3 shrink-0 space-y-1"
        style={{ borderTop: `1px solid ${SLATE[100]}` }}
      >
        <Link
          to="/profile"
          className="flex items-center gap-3 rounded-xl p-3 no-underline transition-all"
          style={{ background: SLATE[50], border: `1px solid ${SLATE[200]}` }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = INDIGO[50])}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = SLATE[50])}
        >
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${INDIGO[500]}, ${INDIGO[600]})` }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[13px] font-semibold truncate"
              style={{ color: SLATE[900] }}
            >
              {displayName}
            </div>
            <div className="text-[11px] truncate" style={{ color: SLATE[500] }}>
              {role ? (ROLE_LABELS[role] ?? role) : ""}
            </div>
          </div>
        </Link>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all text-left"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: SLATE[500] }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = SLATE[50];
            (e.currentTarget as HTMLButtonElement).style.color = SLATE[700];
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = SLATE[500];
          }}
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
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
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
          className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 h-[56px]"
          style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(12px)",
            borderBottom: `1px solid ${SLATE[200]}`,
          }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: SLATE[500] }}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-md flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${INDIGO[500]}, ${INDIGO[600]})` }}
              >
                <SlackIcon className="h-3.5 w-3.5" />
              </div>
              <span
                className="text-[14px] font-extrabold"
                style={{ color: SLATE[900], letterSpacing: "-0.02em" }}
              >
                Slack Autom8
              </span>
            </div>
          </div>
          <Link
            to="/profile"
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${INDIGO[500]}, ${INDIGO[600]})` }}
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
                    className="text-[26px] sm:text-[30px] font-extrabold tracking-tight"
                    style={{ color: SLATE[900], letterSpacing: "-0.025em" }}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1.5 text-[14px]" style={{ color: SLATE[500] }}>
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
