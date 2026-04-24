import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/lib/user-store";
import type { Role } from "@/lib/roles";
import { isOneOf } from "@/lib/roles";
import { toast } from "sonner";

export function RoleGate({
  allowed,
  children,
}: {
  allowed: Role[];
  children: ReactNode;
}) {
  const { user, loading } = useCurrentUser();
  const navigate = useNavigate();
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!isOneOf(user.role, allowed)) {
      setDenied(true);
      toast.error("You don't have permission to access this");
      const t = setTimeout(() => navigate({ to: "/dashboard" }), 800);
      return () => clearTimeout(t);
    }
  }, [user, loading, allowed, navigate]);

  if (loading || !user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-16 text-center text-muted-foreground shadow-[var(--shadow-card)]">
        Loading…
      </div>
    );
  }

  if (denied) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-16 text-center text-destructive">
        You don't have permission to access this page.
      </div>
    );
  }

  return <>{children}</>;
}
