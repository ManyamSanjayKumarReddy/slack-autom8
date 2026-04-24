import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { ScopedSummariesView } from "@/components/summaries/ScopedSummariesView";
import { useTeams } from "@/lib/teams-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <AppShell title="Team Summaries" subtitle="Browse summaries for a single team.">
      <RoleGate allowed={["team_lead", "manager", "admin"]}>
        <Inner />
      </RoleGate>
    </AppShell>
  );
}

function Inner() {
  const { teams, loading } = useTeams();
  const [teamId, setTeamId] = useState<string>("");
  const [channelMap, setChannelMap] = useState<Record<string, string>>({});

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

  const path = useMemo(() => (teamId ? `/summaries/team/${teamId}` : null), [teamId]);

  return (
    <div className="space-y-4">
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
          <p className="mt-3 text-sm text-muted-foreground">
            No teams available yet.
          </p>
        )}
      </div>

      <ScopedSummariesView
        path={path}
        showUser
        channelMap={channelMap}
        placeholder="Choose a team to view its summaries."
        emptyMessage="No summaries for this team yet."
      />
    </div>
  );
}
