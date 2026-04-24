import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { ScopedSummariesView } from "@/components/summaries/ScopedSummariesView";

export const Route = createFileRoute("/workspace-summaries")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: WorkspaceSummariesPage,
});

function WorkspaceSummariesPage() {
  return (
    <AppShell
      title="Workspace Summaries"
      subtitle="Every summary generated across your workspace."
    >
      <RoleGate allowed={["admin"]}>
        <Inner />
      </RoleGate>
    </AppShell>
  );
}

function Inner() {
  const [channelMap, setChannelMap] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = "Workspace Summaries — Slack Summarizer";
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

  return (
    <ScopedSummariesView
      path="/summaries/workspace"
      showUser
      channelMap={channelMap}
      emptyMessage="No summaries in this workspace yet."
    />
  );
}
