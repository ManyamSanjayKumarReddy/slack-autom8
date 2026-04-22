import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { SlackIcon } from "@/components/SlackIcon";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: OnboardingPage,
});

interface WorkspaceChannel {
  id: string;
  name: string;
  is_private: boolean;
  num_members: number;
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<WorkspaceChannel[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Select channels — Slack Summarizer";
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/channels/");
        if (!res.ok) throw new Error("Failed to load channels");
        const data = (await res.json()) as { total: number; channels: WorkspaceChannel[] };
        if (!cancelled) setChannels(data.channels ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load channels");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!channels || selected.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        channels: channels
          .filter((c) => selected.has(c.id))
          .map((c) => ({ channel_id: c.id, channel_name: c.name })),
      };
      const res = await apiFetch("/users/me/channels", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to save channels (${res.status}) ${text}`);
      }
      navigate({ to: "/dashboard" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save channels");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
              <SlackIcon className="h-4.5 w-4.5" />
            </div>
            <span className="font-semibold tracking-tight text-foreground">Slack Summarizer</span>
          </Link>
          <Link
            to="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Select channels to track
          </h1>
          <p className="mt-2 text-muted-foreground">
            Choose the Slack channels you want summarized.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-muted-foreground">Loading channels…</div>
          ) : !channels || channels.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              No channels found in this workspace.
            </div>
          ) : (
            <ul className="divide-y divide-border max-h-[60vh] overflow-y-auto">
              {channels.map((c) => {
                const checked = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <label className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-secondary/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(c.id)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          <span className="text-muted-foreground">
                            {c.is_private ? "🔒 " : "# "}
                          </span>
                          {c.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.num_members} member{c.num_members === 1 ? "" : "s"}
                        </div>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="mt-8 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
          <button
            onClick={handleSubmit}
            disabled={submitting || selected.size === 0}
            className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving…" : "Save channels"}
          </button>
        </div>
      </main>
    </div>
  );
}
