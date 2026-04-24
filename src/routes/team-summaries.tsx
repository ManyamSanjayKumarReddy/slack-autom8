import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { ScopedSummariesView } from "@/components/summaries/ScopedSummariesView";
import { useTeams } from "@/lib/teams-store";
import { useCurrentUser } from "@/lib/user-store";
import { isOneOf } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const Route = createFileRoute("/team-summaries")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: TeamSummariesPage,
});

function TeamSummariesPage() {
  return (
    <AppShell title="Team Summaries" subtitle="Generate or browse summaries for a team.">
      <RoleGate allowed={["team_lead", "manager", "admin"]}>
        <Inner />
      </RoleGate>
    </AppShell>
  );
}

function Inner() {
  const { user } = useCurrentUser();
  const { teams, loading } = useTeams();
  const [teamId, setTeamId] = useState<string>("");
  const [channelMap, setChannelMap] = useState<Record<string, string>>({});
  const [generateOpen, setGenerateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const canGenerate = isOneOf(user?.role, ["team_lead", "admin"]);

  useEffect(() => {
    document.title = "Team Summaries — Slack Summarizer";
  }, []);

  // Auto-select first team
  useEffect(() => {
    if (!teamId && teams && teams.length > 0) setTeamId(teams[0].id);
  }, [teams, teamId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/users/me/channels?page=1&page_size=200");
        if (res.ok) {
          const data = (await res.json()) as {
            results?: { channel_id: string; channel_name: string }[];
            channels?: { channel_id: string; channel_name: string }[];
          };
          const list = data.results ?? data.channels ?? [];
          const map: Record<string, string> = {};
          for (const c of list) map[c.channel_id] = c.channel_name;
          setChannelMap(map);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const path = useMemo(
    () => (teamId ? `/summaries/team/${teamId}` : null),
    [teamId],
  );
  // Append refreshKey so the view re-fetches when a new summary is generated
  const extraQuery = useMemo(() => (refreshKey ? `_=${refreshKey}` : ""), [refreshKey]);

  return (
    <div className="space-y-4">
      {canGenerate && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[var(--shadow-card)] flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Generate Team Summary</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pick a team and date range to create a new summary.
            </p>
          </div>
          <button
            onClick={() => setGenerateOpen(true)}
            disabled={!teams?.length}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 sm:px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Generate Team Summary
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[var(--shadow-card)]">
        <label className="block text-xs font-medium text-muted-foreground mb-2">
          Select team
        </label>
        <Select value={teamId} onValueChange={setTeamId} disabled={loading || !teams?.length}>
          <SelectTrigger className="w-full sm:w-[320px]">
            <SelectValue placeholder={loading ? "Loading teams…" : "Choose a team"} />
          </SelectTrigger>
          <SelectContent>
            {teams?.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!loading && (!teams || teams.length === 0) && (
          <p className="mt-3 text-sm text-muted-foreground">No teams available yet.</p>
        )}
      </div>

      <ScopedSummariesView
        path={path}
        extraQuery={extraQuery}
        showUser
        channelMap={channelMap}
        placeholder="Choose a team to view its summaries."
        emptyMessage="No summaries for this team yet."
      />

      {generateOpen && (
        <GenerateTeamSummaryDialog
          open={generateOpen}
          onOpenChange={setGenerateOpen}
          teams={teams ?? []}
          defaultTeamId={teamId}
          onGenerated={(generatedTeamId) => {
            // Switch to the generated team and refresh
            if (generatedTeamId !== teamId) setTeamId(generatedTeamId);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function GenerateTeamSummaryDialog({
  open,
  onOpenChange,
  teams,
  defaultTeamId,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  teams: { id: string; name: string }[];
  defaultTeamId: string;
  onGenerated: (teamId: string) => void;
}) {
  const today = new Date();
  const [teamId, setTeamId] = useState(defaultTeamId || teams[0]?.id || "");
  const [fromDate, setFromDate] = useState<Date | undefined>(today);
  const [toDate, setToDate] = useState<Date | undefined>(today);
  const [context, setContext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (open) {
      setTeamId(defaultTeamId || teams[0]?.id || "");
      setFromDate(new Date());
      setToDate(new Date());
      setContext("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pollForSummary = async (tid: string, baselineCount: number) => {
    setPolling(true);
    const start = Date.now();
    const TIMEOUT = 60_000;
    try {
      while (Date.now() - start < TIMEOUT) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const res = await apiFetch(`/summaries/team/${tid}?page=1&page_size=10`);
          if (res.ok) {
            const data = (await res.json()) as { total?: number; results?: unknown[] };
            const newTotal = data.total ?? data.results?.length ?? 0;
            if (newTotal > baselineCount) {
              toast.success("Team summary ready");
              onGenerated(tid);
              onOpenChange(false);
              return;
            }
          }
        } catch {
          // ignore
        }
      }
      toast.message("Still generating…", {
        description: "Your summary is taking longer than usual. Refresh in a bit.",
      });
      onGenerated(tid);
      onOpenChange(false);
    } finally {
      setPolling(false);
    }
  };

  const handleSubmit = async () => {
    if (!teamId) {
      toast.error("Select a team");
      return;
    }
    setSubmitting(true);
    try {
      // Get baseline count
      let baseline = 0;
      try {
        const baseRes = await apiFetch(`/summaries/team/${teamId}?page=1&page_size=1`);
        if (baseRes.ok) {
          const bd = (await baseRes.json()) as { total?: number; results?: unknown[] };
          baseline = bd.total ?? bd.results?.length ?? 0;
        }
      } catch {
        // ignore
      }

      const params = new URLSearchParams();
      if (fromDate) params.set("from_date", format(fromDate, "yyyy-MM-dd"));
      if (toDate) params.set("to_date", format(toDate, "yyyy-MM-dd"));
      if (context.trim()) params.set("context", context.trim());

      const res = await apiFetch(
        `/summaries/team/${teamId}/generate?${params.toString()}`,
        { method: "POST" },
      );
      if (!res.ok) {
        await handleApiError(res, "Failed to generate team summary");
        setSubmitting(false);
        return;
      }
      toast.success("Generation started", {
        description: "We'll let you know as soon as it's ready.",
      });
      // Begin polling
      pollForSummary(teamId, baseline);
    } catch {
      toast.error("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const busy = submitting || polling;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Team Summary</DialogTitle>
          <DialogDescription>
            Choose a team, date range, and optional context.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Team</Label>
            <Select value={teamId} onValueChange={setTeamId} disabled={busy}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ts-from-date">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="ts-from-date"
                    variant="outline"
                    disabled={busy}
                    className={cn(
                      "justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ts-to-date">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="ts-to-date"
                    variant="outline"
                    disabled={busy}
                    className={cn(
                      "justify-start text-left font-normal",
                      !toDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ts-context">Context (optional)</Label>
            <Input
              id="ts-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. focus on action items, decisions made"
              disabled={busy}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={busy || !teamId}
            className="bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)]"
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {polling ? "Waiting for summary…" : submitting ? "Starting…" : "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
