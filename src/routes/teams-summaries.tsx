import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { ScopedSummariesView } from "@/components/summaries/ScopedSummariesView";
import { useTeams } from "@/lib/teams-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/teams-summaries")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: AllTeamsSummariesPage,
});

function AllTeamsSummariesPage() {
  return (
    <AppShell
      title="All Teams Summaries"
      subtitle="Pick multiple teams and review their summaries together."
    >
      <RoleGate allowed={["manager", "admin"]}>
        <Inner />
      </RoleGate>
    </AppShell>
  );
}

function Inner() {
  const { teams, loading } = useTeams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [channelMap, setChannelMap] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.title = "All Teams Summaries — Slack Summarizer";
  }, []);

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

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const path = activeIds.length > 0 ? `/summaries/teams` : null;
  const extraQuery = useMemo(
    () => (activeIds.length > 0 ? `team_ids=${activeIds.join(",")}` : ""),
    [activeIds],
  );

  const selectedList = teams?.filter((t) => selected.has(t.id)) ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[var(--shadow-card)] space-y-3">
        <label className="block text-xs font-medium text-muted-foreground">Select teams</label>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={loading || !teams?.length}
                className="flex-1 min-w-0 inline-flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                <span className="truncate">
                  {selected.size === 0
                    ? loading
                      ? "Loading teams…"
                      : "Choose one or more teams"
                    : `${selected.size} team${selected.size === 1 ? "" : "s"} selected`}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 ml-2 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(320px,90vw)] p-1" align="start">
              <ul className="max-h-72 overflow-y-auto">
                {teams?.map((t) => {
                  const checked = selected.has(t.id);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => toggle(t.id)}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                      >
                        <span
                          className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center ${checked ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}
                        >
                          {checked && <Check className="h-3 w-3" />}
                        </span>
                        <span className="truncate">{t.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </Popover>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveIds([...selected])}
              disabled={selected.size === 0}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
            >
              Fetch
            </button>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelected(new Set());
                  setActiveIds([]);
                }}
                className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {selectedList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedList.map((t) => (
              <Badge key={t.id} variant="secondary" className="gap-1">
                {t.name}
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  aria-label={`Remove ${t.name}`}
                  className="ml-0.5 inline-flex"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <ScopedSummariesView
        path={path}
        extraQuery={extraQuery}
        showUser
        channelMap={channelMap}
        placeholder="Pick teams and click Fetch to load their summaries."
        emptyMessage="No summaries found for the selected teams."
      />
    </div>
  );
}
