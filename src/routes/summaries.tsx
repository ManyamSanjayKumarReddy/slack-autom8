import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { isAuthenticated } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SummariesTab } from "@/components/summaries/SummariesTab";

export const Route = createFileRoute("/summaries")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: MySummariesPage,
});

function MySummariesPage() {
  useEffect(() => {
    document.title = "My Summaries — Slack Summarizer";
  }, []);
  return (
    <AppShell title="My Summaries" subtitle="Generated summaries from your tracked channels.">
      <SummariesTab />
    </AppShell>
  );
}
