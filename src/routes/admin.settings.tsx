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
  personal_summary_daily_limit: number;
  project_summary_daily_limit: number;
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
  const [personalLimit, setPersonalLimit] = useState("");
  const [projectLimit, setProjectLimit] = useState("");

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
      setPersonalLimit(String(data.personal_summary_daily_limit));
      setProjectLimit(String(data.project_summary_daily_limit));
    } catch {
      toast.error("Network error loading limits.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const personal = parseInt(personalLimit, 10);
    const project = parseInt(projectLimit, 10);
    if (isNaN(personal) || personal < 1) {
      toast.error("Personal limit must be a positive number.");
      return;
    }
    if (isNaN(project) || project < 1) {
      toast.error("Project limit must be a positive number.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/admin/limits", {
        method: "PUT",
        body: JSON.stringify({
          personal_summary_daily_limit: personal,
          project_summary_daily_limit: project,
        }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to update limits");
        return;
      }
      const data = (await res.json()) as Limits;
      setLimits(data);
      setPersonalLimit(String(data.personal_summary_daily_limit));
      setProjectLimit(String(data.project_summary_daily_limit));
      toast.success("Limits updated successfully.");
    } catch {
      toast.error("Network error saving limits.");
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    limits !== null &&
    (parseInt(personalLimit, 10) !== limits.personal_summary_daily_limit ||
      parseInt(projectLimit, 10) !== limits.project_summary_daily_limit);

  return (
    <section
      className="rounded-2xl bg-card overflow-hidden border border-border"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="px-4 sm:px-6 py-4 flex items-center gap-2 border-b border-border">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground" style={{ fontSize: "13.5px" }}>
          Daily Summary Limits
        </h2>
      </div>

      {loading ? (
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-full max-w-xs" />
          <Skeleton className="h-10 w-full max-w-xs" />
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            Set the maximum number of summaries each user can generate per day. Limits reset at midnight UTC.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 max-w-xl">
            <div className="flex flex-col gap-2">
              <Label htmlFor="personal-limit">Personal summary daily limit</Label>
              <input
                id="personal-limit"
                type="number"
                min={1}
                value={personalLimit}
                onChange={(e) => setPersonalLimit(e.target.value)}
                disabled={saving}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Max personal summaries per user per day.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="project-limit">Project summary daily limit</Label>
              <input
                id="project-limit"
                type="number"
                min={1}
                value={projectLimit}
                onChange={(e) => setProjectLimit(e.target.value)}
                disabled={saving}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Max project summaries per user per day.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save limits"}
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
