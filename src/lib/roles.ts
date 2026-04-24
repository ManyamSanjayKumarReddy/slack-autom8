export type Role = "employee" | "team_lead" | "manager" | "admin";

export const ROLE_RANK: Record<Role, number> = {
  employee: 1,
  team_lead: 2,
  manager: 3,
  admin: 4,
};

export function hasMinRole(role: Role | undefined | null, min: Role): boolean {
  if (!role) return false;
  return (ROLE_RANK[role] ?? 0) >= ROLE_RANK[min];
}

export function isOneOf(role: Role | undefined | null, allowed: Role[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}

export const ROLE_LABEL: Record<Role, string> = {
  employee: "Employee",
  team_lead: "Team Lead",
  manager: "Manager",
  admin: "Admin",
};

export const ROLE_OPTIONS: Role[] = ["employee", "team_lead", "manager", "admin"];
