import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch, isAuthenticated, setToken } from "@/lib/auth";
import { SlackIcon } from "@/components/SlackIcon";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/user-store";
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
import { toast } from "sonner";
import { PaginationControls, type PaginatedResponse } from "@/components/PaginationControls";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setToken(token);
      window.history.replaceState({}, "", "/dashboard");
      return;
    }
    if (!isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: DashboardPage,
});

interface TrackedChannel {
  channel_id: string;
  channel_name: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_SUBTITLES: Record<string, string> = {
  employee: "Here are your latest summaries.",
  team_lead: "View your summaries or generate a team summary.",
  manager: "Select a team to view their summaries.",
  admin: "View workspace-wide activity.",
};

function DashboardPage() {
  const { user } = useCurrentUser();
  const [channels, setChannels] = useState<TrackedChannel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmChannel, setConfirmChannel] = useState<TrackedChannel | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  useEffect(() => {
    document.title = "Dashboard — Slack Summarizer";
  }, []);

  const fetchChannels = async (targetPage = page, targetSize = pageSize) => {
    try {
      const res = await apiFetch(
        `/users/me/channels?page=${targetPage}&page_size=${targetSize}`,
      );
      if (res.ok) {
        const data = (await res.json()) as
          | PaginatedResponse<TrackedChannel>
          | { channels: TrackedChannel[]; total?: number };
        const list = "results" in data ? data.results : (data.channels ?? []);
        setChannels(list);
        if ("results" in data) {
          setTotal(data.total ?? list.length);
          setTotalPages(data.total_pages ?? 1);
          setHasNext(Boolean(data.has_next));
          setHasPrevious(Boolean(data.has_previous));
        } else {
          setTotal(data.total ?? list.length);
          setTotalPages(1);
          setHasNext(false);
          setHasPrevious(false);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user && user.role !== "employee" && user.role !== "team_lead") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!cancelled) await fetchChannels();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, user?.role]);

  const handleRemove = async (channelId: string) => {
    setRemovingId(channelId);
    try {
      const res = await apiFetch(`/users/me/channels/${channelId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Channel removed");
        await fetchChannels();
        if (channels && channels.length === 1 && page > 1) {
          setPage((p) => Math.max(1, p - 1));
        }
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
  const roleSubtitle = user?.role ? ROLE_SUBTITLES[user.role] : "Manage tracked channels and review generated summaries.";
  const canManageChannels = user?.role === "employee" || user?.role === "team_lead";

  // For manager/admin, show stats overview instead of channels section
  if (!canManageChannels) {
    return (
      <AppShell title={`Welcome back, ${displayName}`} subtitle={roleSubtitle}>
        <DashboardStats />
        <section className="rounded-2xl border border-border bg-card p-12 sm:p-16 text-center shadow-[var(--shadow-card)] mt-6">
          <div className="mx-auto h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
            <SlackIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-foreground">
            {user?.role === "admin" ? "Workspace overview" : "Team overview"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            {user?.role === "admin"
              ? "Use the sidebar to view workspace summaries, manage teams, or administer users."
              : "Use the sidebar to view team summaries or manage your teams."}
          </p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Welcome back, ${displayName}`}
      subtitle={roleSubtitle}
    >
      {loading ? (
        <section className="rounded-2xl border border-border bg-card p-16 text-center text-muted-foreground shadow-[var(--shadow-card)]">
          Loading…
        </section>
      ) : !channels || channels.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card p-12 sm:p-16 text-center shadow-[var(--shadow-card)]">
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
          <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-foreground">
              Tracked channels ({total})
            </h2>
            <Link
              to="/onboarding"
              className="inline-flex items-center rounded-lg bg-primary px-3 sm:px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Manage channels
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {channels.map((c) => (
              <li
                key={c.channel_id}
                className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-muted-foreground shrink-0">#</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {c.channel_name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.channel_id}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmChannel(c)}
                  disabled={removingId === c.channel_id}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 shrink-0"
                >
                  {removingId === c.channel_id ? "Removing…" : "Remove"}
                </button>
              </li>
            ))}
          </ul>

          <PaginationControls
            page={page}
            total_pages={totalPages}
            has_next={hasNext}
            has_previous={hasPrevious}
            page_size={pageSize}
            onPageChange={(p) => {
              if (p < 1 || p > totalPages) return;
              setPage(p);
            }}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </section>
      )}

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
    </AppShell>
  );
}
