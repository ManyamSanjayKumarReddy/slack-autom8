import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

interface Limits {
  weekly_limit: number;
  updated_at: string;
}

export const Route = createFileRoute("/admin/settings")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <AppShell title="Settings">
      <div className="space-y-8">
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
          <div className="relative">
            <h1
              className="font-extrabold mb-1.5"
              style={{ fontSize: "24px", color: "var(--banner-heading-color)", letterSpacing: "-0.025em" }}
            >
              Settings
            </h1>
            <p style={{ fontSize: "14px", color: "var(--banner-subtitle-color)" }}>
              Configure global workspace limits for summary generation.
            </p>
          </div>
        </div>

        <RoleGate allowed={["admin"]}>
          <LimitsSection />
        </RoleGate>
      </div>
    </AppShell>
  );
}

function LimitsSection() {
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weeklyLimit, setWeeklyLimit] = useState("");

  useEffect(() => {
    document.title = "Settings — Slack Summarizer";
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/limits");
      if (!res.ok) {
        await handleApiError(res, "Failed to load limits");
        return;
      }
      const data = (await res.json()) as Limits;
      setLimits(data);
      setWeeklyLimit(String(data.weekly_limit));
    } catch {
      toast.error("Network error loading limits.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const weekly = parseInt(weeklyLimit, 10);
    if (isNaN(weekly) || weekly < 1) {
      toast.error("Weekly limit must be a positive number.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/admin/limits", {
        method: "PUT",
        body: JSON.stringify({ weekly_limit: weekly }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to update limits");
        return;
      }
      const data = (await res.json()) as Limits;
      setLimits(data);
      setWeeklyLimit(String(data.weekly_limit));
      toast.success("Limits updated successfully.");
    } catch {
      toast.error("Network error saving limits.");
    } finally {
      setSaving(false);
    }
  };

  const isDirty = limits !== null && parseInt(weeklyLimit, 10) !== limits.weekly_limit;

  return (
    <section
      className="rounded-2xl bg-card overflow-hidden border border-border"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="px-4 sm:px-6 py-4 flex items-center gap-2 border-b border-border">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground" style={{ fontSize: "13.5px" }}>
          Weekly Generation Limit
        </h2>
      </div>

      {loading ? (
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-full max-w-xs" />
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            Maximum number of manual summary generations per user per week (personal + project combined).
            Auto-generated summaries never count against this limit. Resets every Monday at 00:00 UTC.
          </p>

          <div className="max-w-xs flex flex-col gap-2">
            <Label htmlFor="weekly-limit">Weekly generation limit</Label>
            <input
              id="weekly-limit"
              type="number"
              min={1}
              value={weeklyLimit}
              onChange={(e) => setWeeklyLimit(e.target.value)}
              disabled={saving}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Counts personal + project generations together. Minimum: 1.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save limit"}
            </Button>

            {limits?.updated_at && (
              <span className="text-xs text-muted-foreground">
                Last updated{" "}
                {format(new Date(limits.updated_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
