import type { Role } from "@/lib/roles";
import { ROLE_LABEL } from "@/lib/roles";

const STYLES: Record<Role, string> = {
  employee:
    "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200 border-slate-300/50 dark:border-slate-600/50",
  team_lead:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-300/50 dark:border-blue-500/30",
  manager:
    "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300 border-orange-300/50 dark:border-orange-500/30",
  admin:
    "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300 border-red-300/50 dark:border-red-500/30",
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
  const label = ROLE_LABEL[safe];
  const sizeClass = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClass} ${style} ${className}`}
    >
      {label}
    </span>
  );
}
