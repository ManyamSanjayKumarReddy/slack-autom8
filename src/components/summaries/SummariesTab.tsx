import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { apiFetch } from "@/lib/auth";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Info, RefreshCw } from "lucide-react";
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
import { GenerateSummaryDialog } from "./GenerateSummaryDialog";
import { ViewSummaryDialog } from "./ViewSummaryDialog";

export interface Summary {
  id: string;
  summary_text?: string;
  summary?: string;
  channel_ids: string[];
  message_count: number;
  from_date: string;
  to_date: string;
  created_at: string;
  is_auto_generated?: boolean;
}

function formatDate(d: string) {
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return d;
  }
}

function formatDateTime(d: string) {
  try {
    return format(new Date(d), "MMM d, yyyy h:mm a");
  } catch {
    return d;
  }
}

export function SummariesTab() {
  const [summaries, setSummaries] = useState<Summary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewing, setViewing] = useState<Summary | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Summary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [channelMap, setChannelMap] = useState<Record<string, string>>({});
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Refs to avoid stale closures inside intervals
  const summariesRef = useRef<Summary[] | null>(null);
  const generationPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    summariesRef.current = summaries;
  }, [summaries]);

  const fetchSummaries = async (): Promise<Summary[] | null> => {
    try {
      const res = await apiFetch("/summaries/");
      if (res.ok) {
        const data = (await res.json()) as { total: number; summaries: Summary[] };
        const list = data.summaries ?? [];
        setSummaries(list);
        return list;
      }
      return null;
    } catch {
      return null;
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      await fetchSummaries();
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchSummaries();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    (async () => {
      try {
        const res = await apiFetch("/users/me/channels");
        if (res.ok) {
          const data = (await res.json()) as {
            channels: { channel_id: string; channel_name: string }[];
          };
          const map: Record<string, string> = {};
          for (const c of data.channels ?? []) {
            map[c.channel_id] = c.channel_name;
          }
          setChannelMap(map);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      if (generationPollRef.current) clearInterval(generationPollRef.current);
      if (autoRefreshIntervalRef.current) clearInterval(autoRefreshIntervalRef.current);
    };
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshIntervalRef.current = setInterval(() => {
        fetchSummaries();
      }, 2000);
    } else if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh]);

  const startGenerationPolling = (initialCount: number) => {
    if (generationPollRef.current) clearInterval(generationPollRef.current);
    let attempts = 0;
    generationPollRef.current = setInterval(async () => {
      attempts += 1;
      const list = await fetchSummaries();
      if (list && list.length > initialCount) {
        if (generationPollRef.current) {
          clearInterval(generationPollRef.current);
          generationPollRef.current = null;
        }
        toast.success("Summary ready!");
        return;
      }
      if (attempts >= 30) {
        if (generationPollRef.current) {
          clearInterval(generationPollRef.current);
          generationPollRef.current = null;
        }
        toast.error("Taking longer than expected, please refresh manually");
      }
    }, 2000);
  };

  const handleGenerated = () => {
    setGenerateOpen(false);
    toast("Summary is being generated...");
    const initialCount = summariesRef.current?.length ?? 0;
    startGenerationPolling(initialCount);
  };

  const handleView = async (s: Summary) => {
    if (s.summary_text || s.summary) {
      setViewing(s);
      return;
    }
    try {
      const res = await apiFetch(`/summaries/${s.id}`);
      if (res.ok) {
        const full = (await res.json()) as Summary;
        setViewing({ ...s, ...full });
      } else {
        setViewing(s);
      }
    } catch {
      setViewing(s);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await apiFetch(`/summaries/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSummaries((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
        toast.success("Summary deleted");
      } else {
        toast.error("Failed to delete summary");
      }
    } catch {
      toast.error("Failed to delete summary");
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-foreground">
          Summaries{summaries ? ` (${summaries.length})` : ""}
        </h2>
        <div className="flex items-center gap-3">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  aria-label="Refresh summaries"
                  className="inline-flex items-center justify-center rounded-md border border-border bg-background h-9 w-9 text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Refresh now</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button
            onClick={() => setGenerateOpen(true)}
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Generate Summary
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !summaries || summaries.length === 0 ? (
        <div className="p-16 text-center">
          <p className="text-sm text-muted-foreground">
            No summaries yet. Click Generate Summary to get started.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6">Date Range</TableHead>
              <TableHead>Channels</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="px-6 text-sm text-foreground">
                  {formatDate(s.from_date)} – {formatDate(s.to_date)}
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  <div className="inline-flex items-center gap-1.5">
                    <span>{s.channel_ids?.length ?? 0}</span>
                    {(s.channel_ids?.length ?? 0) > 0 && (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="Show channels"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <ul className="space-y-0.5">
                              {s.channel_ids.map((id) => (
                                <li key={id}>#{channelMap[id] ?? id}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-foreground">{s.message_count}</TableCell>
                <TableCell>
                  {s.is_auto_generated ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                    >
                      Auto
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium"
                    >
                      Manual
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(s.created_at)}
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleView(s)}
                      className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => setConfirmDelete(s)}
                      disabled={deletingId === s.id}
                      className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      {deletingId === s.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <GenerateSummaryDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onGenerated={handleGenerated}
      />

      <ViewSummaryDialog
        summary={viewing}
        channelMap={channelMap}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      />

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open && deletingId === null) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this summary?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the summary. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingId !== null}
              onClick={(e) => {
                e.preventDefault();
                if (confirmDelete) handleDelete(confirmDelete.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId !== null ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
