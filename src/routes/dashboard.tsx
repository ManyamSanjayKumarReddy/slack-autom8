import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch, clearToken, isAuthenticated, setToken } from "@/lib/auth";
import { SlackIcon } from "@/components/SlackIcon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SummariesTab } from "@/components/summaries/SummariesTab";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    // Capture token from URL (OAuth redirect)
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setToken(token);
      // Clean URL
      window.history.replaceState({}, "", "/dashboard");
      return;
    }
    if (!isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: DashboardPage,
});

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TrackedChannel {
  channel_id: string;
  channel_name: string;
  is_active: boolean;
  created_at: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [channels, setChannels] = useState<TrackedChannel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmChannel, setConfirmChannel] = useState<TrackedChannel | null>(null);

  useEffect(() => {
    document.title = "Dashboard — Slack Summarizer";
    let cancelled = false;
    (async () => {
      try {
        const [meRes, chRes] = await Promise.all([
          apiFetch("/users/me"),
          apiFetch("/users/me/channels"),
        ]);
        if (!cancelled && meRes.ok) {
          setUser((await meRes.json()) as UserInfo);
        }
        if (!cancelled && chRes.ok) {
          const data = (await chRes.json()) as { total: number; channels: TrackedChannel[] };
          setChannels(data.channels ?? []);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    clearToken();
    navigate({ to: "/" });
  };

  const handleRemove = async (channelId: string) => {
    setRemovingId(channelId);
    try {
      const res = await apiFetch(`/users/me/channels/${channelId}`, { method: "DELETE" });
      if (res.ok) {
        setChannels((prev) => (prev ? prev.filter((c) => c.channel_id !== channelId) : prev));
        toast.success("Channel removed");
      } else {
        toast.error("Failed to remove channel");
      }
    } catch {
      toast.error("Failed to remove channel");
    } finally {
      setRemovingId(null);
      setConfirmChannel(null);
    }
  };

  const displayName = user?.name || user?.email || "there";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
              <SlackIcon className="h-4.5 w-4.5" />
            </div>
            <span className="font-semibold tracking-tight text-foreground">Slack Summarizer</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/profile"
              className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="h-7 w-7 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-foreground">
                {(displayName?.[0] ?? "?").toUpperCase()}
              </span>
              <span>{displayName}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {getGreeting()}, {displayName}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage the Slack channels you want summarized.
            </p>
          </div>
          {channels && channels.length > 0 && (
            <Link
              to="/onboarding"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Manage channels
            </Link>
          )}
        </div>

        {loading ? (
          <section className="rounded-2xl border border-border bg-card p-16 text-center text-muted-foreground shadow-[var(--shadow-card)]">
            Loading…
          </section>
        ) : !channels || channels.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-card p-16 text-center shadow-[var(--shadow-card)]">
            <div className="mx-auto h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
              <SlackIcon className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-foreground">
              Select channels to track
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick the Slack channels you want summarized to get started.
            </p>
            <Link
              to="/onboarding"
              className="mt-6 inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Choose channels
            </Link>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                Tracked channels ({channels.length})
              </h2>
            </div>
            <ul className="divide-y divide-border">
              {channels.map((c) => (
                <li
                  key={c.channel_id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">#</span>
                    <div>
                      <div className="text-sm font-medium text-foreground">{c.channel_name}</div>
                      <div className="text-xs text-muted-foreground">{c.channel_id}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmChannel(c)}
                    disabled={removingId === c.channel_id}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {removingId === c.channel_id ? "Removing…" : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <AlertDialog
        open={confirmChannel !== null}
        onOpenChange={(open) => {
          if (!open && removingId === null) setConfirmChannel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this channel?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmChannel
                ? `#${confirmChannel.channel_name} will no longer be summarized. You can add it back any time.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removingId !== null}
              onClick={(e) => {
                e.preventDefault();
                if (confirmChannel) handleRemove(confirmChannel.channel_id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingId !== null ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
