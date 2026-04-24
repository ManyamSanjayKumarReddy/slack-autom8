import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Info } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PaginationControls, type PaginatedResponse } from "@/components/PaginationControls";
import { ViewSummaryDialog } from "@/components/summaries/ViewSummaryDialog";
import type { Summary } from "@/components/summaries/SummariesTab";

interface ScopedSummary extends Summary {
  user_id?: string;
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

export interface ScopedSummariesProps {
  /** Path to call (without query). e.g. `/summaries/team/abc` */
  path: string | null;
  /** Extra query params (without page/page_size) */
  extraQuery?: string;
  /** Show the user_id column (team/workspace views) */
  showUser?: boolean;
  /** Empty state message when path is null */
  placeholder?: string;
  /** Empty state when fetched but no data */
  emptyMessage?: string;
  /** Channel id => name lookup */
  channelMap?: Record<string, string>;
}

export function ScopedSummariesView({
  path,
  extraQuery = "",
  showUser = true,
  placeholder = "Select filters above to load summaries.",
  emptyMessage = "No summaries found.",
  channelMap = {},
}: ScopedSummariesProps) {
  const [summaries, setSummaries] = useState<ScopedSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<ScopedSummary | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  // Reset to page 1 whenever the path/extraQuery changes
  useEffect(() => {
    setPage(1);
  }, [path, extraQuery]);

  useEffect(() => {
    if (!path) {
      setSummaries(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const sep = path.includes("?") || extraQuery.startsWith("?") ? "&" : "?";
        const eq = extraQuery
          ? extraQuery.startsWith("?")
            ? extraQuery.slice(1) + "&"
            : extraQuery + "&"
          : "";
        const res = await apiFetch(`${path}${sep}${eq}page=${page}&page_size=${pageSize}`);
        if (!res.ok) {
          await handleApiError(res, "Failed to load summaries");
          if (!cancelled) setSummaries([]);
          return;
        }
        const data = (await res.json()) as PaginatedResponse<ScopedSummary>;
        if (cancelled) return;
        const list = data.results ?? [];
        setSummaries(list);
        setTotal(data.total ?? list.length);
        setTotalPages(data.total_pages ?? 1);
        setHasNext(Boolean(data.has_next));
        setHasPrevious(Boolean(data.has_previous));
      } catch {
        if (!cancelled) setSummaries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, extraQuery, page, pageSize]);

  const handleView = async (s: ScopedSummary) => {
    if (s.summary_text || s.summary) {
      setViewing(s);
      return;
    }
    try {
      const res = await apiFetch(`/summaries/${s.id}`);
      if (res.ok) {
        const full = (await res.json()) as ScopedSummary;
        setViewing({ ...s, ...full });
      } else {
        setViewing(s);
      }
    } catch {
      setViewing(s);
    }
  };

  if (!path) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-[var(--shadow-card)]">
        {placeholder}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-foreground">
          {total > 0
            ? `${total} ${total === 1 ? "summary" : "summaries"} found`
            : "Summaries"}
        </h2>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !summaries || summaries.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">{emptyMessage}</div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="md:hidden divide-y divide-border">
            {summaries.map((s) => (
              <li key={s.id} className="px-4 py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {formatDate(s.from_date)} – {formatDate(s.to_date)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(s.created_at)}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      s.is_auto_generated
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium shrink-0"
                        : "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium shrink-0"
                    }
                  >
                    {s.is_auto_generated ? "Auto" : "Manual"}
                  </Badge>
                </div>
                {showUser && s.user_id && (
                  <div className="text-xs text-muted-foreground">
                    User: <span className="font-mono text-foreground">{s.user_id}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">
                      {s.channel_ids?.length ?? 0}
                    </span>{" "}
                    channel{(s.channel_ids?.length ?? 0) === 1 ? "" : "s"}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">{s.message_count}</span>{" "}
                    message{s.message_count === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  onClick={() => handleView(s)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  View
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {showUser && <TableHead className="px-6">User ID</TableHead>}
                  <TableHead className={showUser ? "" : "px-6"}>Date Range</TableHead>
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
                    {showUser && (
                      <TableCell className="px-6 text-xs text-foreground font-mono max-w-[160px] truncate">
                        {s.user_id ?? "—"}
                      </TableCell>
                    )}
                    <TableCell className={`text-sm text-foreground ${showUser ? "" : "px-6"}`}>
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
                      <Badge
                        variant="outline"
                        className={
                          s.is_auto_generated
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                            : "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium"
                        }
                      >
                        {s.is_auto_generated ? "Auto" : "Manual"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(s.created_at)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <button
                        onClick={() => handleView(s)}
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                      >
                        View
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

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
        </>
      )}

      <ViewSummaryDialog
        summary={viewing}
        channelMap={channelMap}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      />
    </section>
  );
}
