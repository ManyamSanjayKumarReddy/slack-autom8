import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Save, Settings2, Clock } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
              Configure global workspace limits and auto-summary schedule.
            </p>
          </div>
        </div>

        <RoleGate allowed={["admin"]}>
          <LimitsSection />
        </RoleGate>

        <RoleGate allowed={["admin"]}>
          <ScheduleSection />
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
    document.title = "Settings — Slack Autom8";
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

/* ─── Helpers ──────────────────────────────────────────── */

function fmt12h(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${period}`;
}

function fmtPreview(hour: number, minute: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = minute === 0 ? "00" : "30";
  return `${h}:${m} ${period} IST`;
}

/* ─── Schedule section ─────────────────────────────────── */

interface Schedule {
  trigger_hour: number;
  trigger_minute: number;
  trigger_time_ist: string;
  updated_at: string;
}

function ScheduleSection() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hour, setHour] = useState(22);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/schedule");
      if (!res.ok) {
        await handleApiError(res, "Failed to load schedule");
        return;
      }
      const data = (await res.json()) as Schedule;
      setSchedule(data);
      setHour(data.trigger_hour);
      setMinute(data.trigger_minute);
    } catch {
      toast.error("Network error loading schedule.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (hour < 0 || hour > 23) {
      toast.error("Hour must be between 0 and 23.");
      return;
    }
    if (minute !== 0 && minute !== 30) {
      toast.error("Minute must be :00 or :30.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/admin/schedule", {
        method: "PUT",
        body: JSON.stringify({ trigger_hour: hour, trigger_minute: minute }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to update schedule");
        return;
      }
      const data = (await res.json()) as Schedule;
      setSchedule(data);
      setHour(data.trigger_hour);
      setMinute(data.trigger_minute);
      toast.success(`Schedule updated to ${fmtPreview(data.trigger_hour, data.trigger_minute)}`);
    } catch {
      toast.error("Network error saving schedule.");
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    schedule !== null &&
    (hour !== schedule.trigger_hour || minute !== schedule.trigger_minute);

  return (
    <section
      className="rounded-2xl bg-card overflow-hidden border border-border"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="px-4 sm:px-6 py-4 flex items-center gap-2 border-b border-border">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground" style={{ fontSize: "13.5px" }}>
          Daily Auto-Summary Schedule
        </h2>
      </div>

      {loading ? (
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-full max-w-xs" />
          <Skeleton className="h-10 w-48" />
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            Set the time (IST) at which auto-summaries are generated daily for all projects.
            Only :00 and :30 minute values are supported.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            {/* Hour selector */}
            <div className="flex flex-col gap-2">
              <Label>Hour</Label>
              <Select
                value={String(hour)}
                onValueChange={(v) => setHour(Number(v))}
                disabled={saving}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="thin-scroll max-h-60 overflow-y-auto">
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {fmt12h(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Minute toggle */}
            <div className="flex flex-col gap-2">
              <Label>Minute</Label>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5 h-9">
                {[0, 30].map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={saving}
                    onClick={() => setMinute(m)}
                    className="rounded-md px-4 py-1 text-sm font-semibold transition-colors h-full disabled:opacity-50"
                    style={
                      minute === m
                        ? { background: "#1264a3", color: "#fff" }
                        : { color: "var(--muted-foreground)", background: "transparent" }
                    }
                  >
                    :{m === 0 ? "00" : "30"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
            style={{
              background: "var(--accent)",
              color: "var(--accent-foreground)",
              border: "1px solid rgba(18,100,163,0.15)",
            }}
          >
            <Clock className="h-4 w-4 shrink-0" style={{ color: "#1264a3" }} />
            Summaries will auto-generate daily at{" "}
            <span className="font-bold">{fmtPreview(hour, minute)}</span>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save schedule"}
            </Button>

            {schedule?.updated_at && (
              <span className="text-xs text-muted-foreground">
                Last updated{" "}
                {format(new Date(schedule.updated_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
