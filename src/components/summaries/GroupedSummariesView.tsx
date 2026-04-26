import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { RefreshCw, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiFetch } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Button } from "@/components/ui/button";
import { StructuredProjectSummary } from "@/components/summaries/StructuredProjectSummary";

export interface ProjectSummary {
  id: string;
  summary_text: string;
  message_count: number;
  from_date: string;
  to_date: string;
  created_at: string;
  is_auto_generated?: boolean;
  user_id?: string;
  user_name?: string;
}

interface GroupedResponse {
  total: number;
  project_id: string;
  grouped_by_date: Record<string, ProjectSummary[]>;
}

interface Props {
  projectId: string;
  /** "personal" or "project" — chooses endpoint */
  scope: "personal" | "project";
  /** Refresh trigger — increment to force re-fetch */
  refreshKey: number;
  /** Whether to allow delete buttons (only for personal) */
  canDelete?: boolean;
  /** When true, polls every 5s for up to 60s (after a generate kicks off) */
  poll: boolean;
  onPollComplete?: () => void;
}

function fmtDate(d: string) {
  try {
    return format(new Date(d), "EEEE, MMM d, yyyy");
  } catch {
    return d;
  }
}

function fmtTime(d: string) {
  try {
    return format(new Date(d), "h:mm a");
  } catch {
    return d;
  }
}

export function GroupedSummariesView({
  projectId,
  scope,
  refreshKey,
  canDelete = false,
  poll,
  onPollComplete,
}: Props) {
  const [data, setData] = useState<GroupedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ProjectSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStart = useRef<number>(0);
  const baselineCount = useRef<number>(0);

  const basePath =
    scope === "personal"
      ? `/summaries/projects/${projectId}/personal`
      : `/summaries/projects/${projectId}`;

  const fetchData = async (silent = false): Promise<number> => {
    if (!silent) setLoading(true);
    try {
      const res = await apiFetch(basePath);
      if (!res.ok) {
        await handleApiError(res, "Failed to load summaries");
        setData({ total: 0, project_id: projectId, grouped_by_date: {} });
        return 0;
      }
      const json = (await res.json()) as GroupedResponse;
      setData(json);
      return json.total ?? 0;
    } catch {
      setData({ total: 0, project_id: projectId, grouped_by_date: {} });
      return 0;
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial + on refreshKey
  useEffect(() => {
    fetchData();
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, scope, refreshKey]);

  // Polling effect when poll=true
  useEffect(() => {
    if (!poll) return;
    pollStart.current = Date.now();
    baselineCount.current = data?.total ?? 0;

    const tick = async () => {
      const newTotal = await fetchData(true);
      if (newTotal > baselineCount.current) {
        toast.success("Summary ready");
        if (pollTimer.current) clearTimeout(pollTimer.current);
        pollTimer.current = null;
        onPollComplete?.();
        return;
      }
      if (Date.now() - pollStart.current > 60_000) {
        if (pollTimer.current) clearTimeout(pollTimer.current);
        pollTimer.current = null;
        toast.message("Still generating…", {
          description: "Tap refresh in a moment.",
        });
        onPollComplete?.();
        return;
      }
      pollTimer.current = setTimeout(tick, 5000);
    };
    pollTimer.current = setTimeout(tick, 5000);

    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
      pollTimer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (s: ProjectSummary) => {
    if (scope !== "personal") return;
    setDeletingId(s.id);
    try {
      const res = await apiFetch(`/summaries/projects/${projectId}/personal/${s.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to delete summary");
        return;
      }
      toast.success("Summary deleted");
      await fetchData(true);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const dates = data
    ? Object.keys(data.grouped_by_date).sort((a, b) => (a < b ? 1 : -1))
    : [];

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {data && data.total > 0
              ? `${data.total} ${data.total === 1 ? "summary" : "summaries"}`
              : "Summaries"}
          </h2>
          {poll && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Generating…
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={refreshing || loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !data || data.total === 0 ? (
        <div className="p-12 text-center space-y-2">
          <div className="text-2xl mb-3">📄</div>
          <p className="text-sm font-medium text-foreground">No summaries yet</p>
          <p className="text-xs text-muted-foreground">
            {scope === "personal"
              ? "Generate your personal summary to see your activity digest here."
              : "Generate a project summary to see team-wide digests here."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {dates.map((date) => (
            <div key={date} className="px-4 sm:px-6 py-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {fmtDate(date)}
              </div>
              <div className="space-y-3">
                {data.grouped_by_date[date].map((s) => (
                  <SummaryCard
                    key={s.id}
                    summary={s}
                    structured={scope === "project"}
                    canDelete={canDelete}
                    deleting={deletingId === s.id}
                    onDelete={() => setConfirmDelete(s)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this summary?</AlertDialogTitle>
            <AlertDialogDescription>
              This summary will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmDelete) handleDelete(confirmDelete);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function SummaryCard({
  summary,
  structured,
  canDelete,
  deleting,
  onDelete,
}: {
  summary: ProjectSummary;
  structured?: boolean;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const text = summary.summary_text || "";
  const isLong = text.length > 280;
  const display = expanded || !isLong ? text : text.slice(0, 280) + "…";

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2.5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {summary.user_name && (
            <span className="text-sm font-medium text-foreground">{summary.user_name}</span>
          )}
          <span className="text-xs text-muted-foreground">{fmtTime(summary.created_at)}</span>
          <Badge
            variant="outline"
            className={
              summary.is_auto_generated
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                : "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium"
            }
          >
            {summary.is_auto_generated ? "Auto" : "Manual"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {summary.message_count} messages
          </span>
        </div>
        {canDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="text-xs text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50 inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded"
          >
            <Trash2 className="h-3 w-3" />
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
      {structured ? (
        <StructuredProjectSummary text={text} />
      ) : (
        <>
          <div className="text-sm text-foreground leading-relaxed [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2 [&_p]:mt-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{display}</ReactMarkdown>
          </div>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition-colors"
            >
              {expanded ? "↑ Show less" : "↓ Show more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
