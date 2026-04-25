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
import { RoleBadge } from "@/components/RoleBadge";
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

  // Close drawer on route change
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
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-foreground hover:bg-secondary transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-accent flex items-center justify-center">
                <SlackIcon className="h-4 w-4" />
              </div>
              <span className="font-semibold tracking-tight text-foreground truncate hidden sm:inline">
                Slack Summarizer
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/profile"
              className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors max-w-[220px]"
            >
              <span className="h-7 w-7 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-foreground">
                {initial}
              </span>
              <span className="truncate">{displayName}</span>
              {role && <RoleBadge role={role} size="xs" />}
            </Link>
            <Link
              to="/profile"
              className="sm:hidden h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-foreground"
              aria-label="Profile"
            >
              {initial}
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 sm:px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-card/40 sticky top-16 h-[calc(100vh-4rem)] flex-col">
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-border">
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <UserIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">Profile</span>
            </Link>
          </div>
        </aside>

        {/* Mobile drawer */}
        {open && (
          <>
            <div
              className="lg:hidden fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col animate-in slide-in-from-left duration-200">
              <div className="h-16 px-4 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-accent flex items-center justify-center">
                    <SlackIcon className="h-4 w-4" />
                  </div>
                  <span className="font-semibold tracking-tight text-foreground truncate">
                    Slack Summarizer
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-md text-foreground hover:bg-secondary"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {user && (
                <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-foreground">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{displayName}</div>
                    <div className="mt-0.5">
                      <RoleBadge role={user.role} size="xs" />
                    </div>
                  </div>
                </div>
              )}
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-3 border-t border-border space-y-1">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <UserIcon className="h-4 w-4 shrink-0" />
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Logout
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className={`mx-auto ${maxWidth} px-4 sm:px-6 py-6 sm:py-10`}>
            {(title || subtitle) && (
              <div className="mb-6 sm:mb-8">
                {title && (
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-2 text-sm sm:text-base text-muted-foreground">{subtitle}</p>
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
