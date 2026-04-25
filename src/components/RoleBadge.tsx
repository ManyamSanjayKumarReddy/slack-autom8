import type { Role } from "@/lib/roles";
import { ROLE_LABEL } from "@/lib/roles";

const STYLES: Record<Role, string> = {
  employee:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600/50",
  team_lead:
    "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  manager:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
  admin:
    "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
};

const DOT: Record<Role, string> = {
  employee: "bg-slate-400",
  team_lead: "bg-blue-500",
  manager: "bg-violet-500",
  admin: "bg-rose-500",
};

export function RoleBadge({
  role,
  size = "sm",
  className = "",
}: {
  role: Role | string;
  size?: "xs" | "sm";
  className?: string;
}) {
  const safe = (role as Role) in STYLES ? (role as Role) : "employee";
  const style = STYLES[safe];
  const dot = DOT[safe];
  const label = ROLE_LABEL[safe];
  const sizeClass = size === "xs" ? "text-[10px] px-1.5 py-0.5 gap-1" : "text-xs px-2 py-0.5 gap-1.5";
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${sizeClass} ${style} ${className}`}
    >
      <span className={`rounded-full shrink-0 ${dot} ${size === "xs" ? "h-1 w-1" : "h-1.5 w-1.5"}`} />
      {label}
    </span>
  );
}
