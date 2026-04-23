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

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  useEffect(() => {
    document.title = "Dashboard — Slack Summarizer";
  }, []);

  // Load user once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await apiFetch("/users/me");
        if (!cancelled && meRes.ok) {
          setUser((await meRes.json()) as UserInfo);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
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
        const list = "results" in data ? data.results : data.channels ?? [];
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
  }, [page, pageSize]);

  const handleLogout = () => {
    clearToken();
    navigate({ to: "/" });
  };

  const handleRemove = async (channelId: string) => {
    setRemovingId(channelId);
    try {
      const res = await apiFetch(`/users/me/channels/${channelId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Channel removed");
        // Refetch current page; if page becomes empty step back
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-accent flex items-center justify-center">
              <SlackIcon className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight text-foreground truncate">Slack Summarizer</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link
              to="/profile"
              className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors max-w-[160px]"
            >
              <span className="h-7 w-7 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-foreground">
                {(displayName?.[0] ?? "?").toUpperCase()}
              </span>
              <span className="truncate">{displayName}</span>
            </Link>
            <Link
              to="/profile"
              className="sm:hidden h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-foreground"
              aria-label="Profile"
            >
              {(displayName?.[0] ?? "?").toUpperCase()}
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

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            {getGreeting()}, {displayName}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            Manage tracked channels and review generated summaries.
          </p>
        </div>

        <Tabs defaultValue="channels" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="summaries">Summaries</TabsTrigger>
          </TabsList>

          <TabsContent value="channels">
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
                          <div className="text-sm font-medium text-foreground truncate">{c.channel_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{c.channel_id}</div>
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
          </TabsContent>

          <TabsContent value="summaries">
            <SummariesTab />
          </TabsContent>
        </Tabs>
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
