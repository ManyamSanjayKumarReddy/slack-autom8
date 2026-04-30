import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { ClipboardList, ChevronDown, ChevronRight, User, FolderKanban, Loader2, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PaginationControls,
  type PaginatedResponse,
} from "@/components/PaginationControls";

export const Route = createFileRoute("/admin/auto-summary-logs")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: AutoSummaryLogsPage,
});

/* ─── Types ─────────────────────────────────────────────── */

type LogStatus = "success" | "partial" | "failed" | "running";

interface MemberResult {
  user_id: string;
  name: string;
  email: string;
  status: "success" | "failed" | "skipped";
  summary_id?: string;
  error?: string;
}

interface LogEntry {
  id: string;
  project_id: string;
  project_name: string;
  status: LogStatus;
  triggered_at: string;
  triggered_at_ist?: string;
  member_count: number;
  success_count: number;
  failed_count: number;
  skipped_count?: number;
  project_summary_status?: "success" | "failed" | "skipped" | null;
  member_results?: MemberResult[];
}

interface SimpleProject {
  id: string;
  name: string;
  slug: string;
}

/* ─── Status badge ───────────────────────────────────────── */

function StatusBadge({ status }: { status: LogStatus | MemberResult["status"] }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
        <CheckCircle2 className="h-3 w-3" /> Success
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
        <AlertTriangle className="h-3 w-3" /> Partial
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800">
        <AlertCircle className="h-3 w-3" /> Failed
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
        Skipped
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
      <Loader2 className="h-3 w-3 animate-spin" /> Running
    </span>
  );
}

/* ─── Detail modal ───────────────────────────────────────── */

function LogDetailModal({ log, open, onClose }: { log: LogEntry | null; open: boolean; onClose: () => void }) {
  const [detail, setDetail] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !log) { setDetail(null); return; }
    if (log.member_results) { setDetail(log); return; }
    setLoading(true);
    apiFetch(`/admin/auto-summary-logs/${log.id}`)
      .then(async (res) => {
        if (res.ok) setDetail(await res.json());
        else await handleApiError(res, "Failed to load log details");
      })
      .catch(() => toast.error("Network error loading log details."))
      .finally(() => setLoading(false));
  }, [open, log]);

  const entry = detail ?? log;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto thin-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            {entry?.project_name ?? "Log Detail"}
          </DialogTitle>
          <DialogDescription>
            {entry?.triggered_at_ist
              ? `Triggered ${entry.triggered_at_ist} IST`
              : entry?.triggered_at
              ? `Triggered ${format(parseISO(entry.triggered_at), "MMM d, yyyy 'at' h:mm a")}`
              : "Auto-summary run details"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : entry ? (
          <div className="space-y-5 py-2">
            {/* Summary row */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge status={entry.status} />
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-emerald-600">{entry.success_count}</span> succeeded ·{" "}
                <span className="font-semibold text-red-600">{entry.failed_count}</span> failed
                {(entry.skipped_count ?? 0) > 0 && (
                  <> · <span className="font-semibold">{entry.skipped_count}</span> skipped</>
                )}
              </div>
            </div>

            {/* Project summary result */}
            {entry.project_summary_status !== undefined && entry.project_summary_status !== null && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
                <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Project summary:</span>
                <StatusBadge status={entry.project_summary_status} />
              </div>
            )}

            {/* Member results */}
            {entry.member_results && entry.member_results.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Member Results
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  {entry.member_results.map((m, idx) => (
                    <div
                      key={m.user_id}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm ${idx > 0 ? "border-t border-border" : ""}`}
                    >
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground truncate">{m.name || m.email}</span>
                        {m.name && (
                          <span className="ml-1.5 text-muted-foreground text-xs">{m.email}</span>
                        )}
                        {m.error && (
                          <p className="text-xs text-destructive mt-0.5 truncate">{m.error}</p>
                        )}
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main page ──────────────────────────────────────────── */

function AutoSummaryLogsPage() {
  return (
    <AppShell title="Summary Logs">
      <div className="space-y-8">
        <div
          className="rounded-2xl px-5 sm:px-8 py-5 sm:py-7 relative overflow-hidden border"
          style={{ background: "var(--banner-bg)", borderColor: "var(--banner-border)" }}
        >
          <div
            className="absolute right-[-40px] top-[-50px] h-[200px] w-[200px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(18,100,163,0.14) 0%, transparent 70%)" }}
          />
          <div className="relative">
            <h1
              className="font-extrabold mb-1.5"
              style={{ fontSize: "24px", color: "var(--banner-heading-color)", letterSpacing: "-0.025em" }}
            >
              Auto-Summary Logs
            </h1>
            <p style={{ fontSize: "14px", color: "var(--banner-subtitle-color)" }}>
              Daily auto-generated summary run history across all projects.
            </p>
          </div>
        </div>

        <RoleGate allowed={["admin"]}>
          <LogsSection />
        </RoleGate>
      </div>
    </AppShell>
  );
}

/* ─── Logs section ───────────────────────────────────────── */

function LogsSection() {
  const [logs, setLogs] = useState<PaginatedResponse<LogEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState<SimpleProject[]>([]);

  // Filters
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    document.title = "Summary Logs — Slack Autom8";
    apiFetch("/projects/?page=1&page_size=200")
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setProjects(data.results ?? (Array.isArray(data) ? data : []));
        }
      })
      .catch(() => {});
  }, []);

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (projectFilter !== "all") params.set("project_id", projectFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFilter) params.set("date", dateFilter);

      const res = await apiFetch(`/admin/auto-summary-logs?${params}`);
      if (!res.ok) {
        await handleApiError(res, "Failed to load logs");
        return;
      }
      setLogs(await res.json());
    } catch {
      toast.error("Network error loading logs.");
    } finally {
      setLoading(false);
    }
  }, [projectFilter, statusFilter, dateFilter]);

  useEffect(() => {
    setPage(1);
  }, [projectFilter, statusFilter, dateFilter]);

  useEffect(() => {
    fetchLogs(page);
  }, [fetchLogs, page]);

  const openDetail = (log: LogEntry) => {
    setSelectedLog(log);
    setModalOpen(true);
  };

  return (
    <>
      <section
        className="rounded-2xl bg-card overflow-hidden border border-border"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {/* Filter bar */}
        <div className="px-4 sm:px-6 py-4 border-b border-border flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground" style={{ fontSize: "13.5px" }}>
              Run History
            </h2>
          </div>

          <div className="flex flex-wrap gap-2 ml-auto">
            {/* Project filter */}
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent className="thin-scroll max-h-56 overflow-y-auto">
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
              </SelectContent>
            </Select>

            {/* Date filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />

            {(projectFilter !== "all" || statusFilter !== "all" || dateFilter) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs px-2"
                onClick={() => { setProjectFilter("all"); setStatusFilter("all"); setDateFilter(""); }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !logs?.results?.length ? (
          <div className="p-12 text-center">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-semibold text-foreground mb-1" style={{ fontSize: "15px" }}>
              No logs found
            </p>
            <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
              Auto-summary runs will appear here once they complete.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Triggered At (IST)</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">✓ / ✗</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.results.map((log) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openDetail(log)}
                    >
                      <TableCell className="font-medium max-w-[180px] truncate">
                        {log.project_name}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {log.triggered_at_ist
                          ? log.triggered_at_ist
                          : format(parseISO(log.triggered_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {log.member_count}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <span className="text-emerald-600 font-semibold">{log.success_count}</span>
                        {" / "}
                        <span className="text-red-600 font-semibold">{log.failed_count}</span>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {logs.total_pages > 1 && (
              <div className="px-4 sm:px-6 py-4 border-t border-border">
                <PaginationControls
                  page={logs.page}
                  total_pages={logs.total_pages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </section>

      <LogDetailModal log={selectedLog} open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
