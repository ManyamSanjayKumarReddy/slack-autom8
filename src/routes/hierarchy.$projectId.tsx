import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  CalendarIcon,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Loader2,
  FileSearch,
  BarChart3,
  RefreshCw,
  Sparkles,
  PenLine,
  Users,
  ArrowLeft,
} from "lucide-react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useIsMobile } from "@/hooks/use-mobile";
import { projectColor, projectInitials } from "@/lib/project-colors";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/hierarchy/$projectId")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: ProjectReportPage,
});

/* ── Types ── */
interface PersonalSummary {
  id: string;
  summary_text: string;
  message_count: number;
  is_auto_generated?: boolean;
  created_at: string;
}
interface HierarchyMember {
  user_id: string;
  user_name: string;
  project_role: "employee" | "team_lead";
  personal_summaries: PersonalSummary[];
}
interface HierarchyDate {
  project_summaries: PersonalSummary[];
  members: HierarchyMember[];
}
interface HierarchyProject {
  project_id: string;
  project_name: string;
  dates: Record<string, HierarchyDate>;
}
interface HierarchyResponse {
  projects: HierarchyProject[];
}
interface FlatRow {
  id: string;
  date: string;
  created_at: string;
  summary_text: string;
  message_count: number;
  is_auto_generated?: boolean;
  type: "project" | "personal";
  member_name?: string;
  member_role?: "employee" | "team_lead";
}


function stripMd(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
}
function flattenProject(project: HierarchyProject): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const [date, d] of Object.entries(project.dates)) {
    for (const s of d.project_summaries) {
      rows.push({ ...s, date, type: "project" });
    }
    for (const m of d.members) {
      for (const s of m.personal_summaries) {
        rows.push({ ...s, date, type: "personal", member_name: m.user_name, member_role: m.project_role });
      }
    }
  }
  return rows.sort((a, b) => {
    if (a.date !== b.date) return a.date > b.date ? -1 : 1;
    if (a.type !== b.type) return a.type === "project" ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
function formatRange(r: DateRange | undefined): string {
  if (!r?.from) return "Pick dates";
  if (!r.to || r.from.toDateString() === r.to.toDateString())
    return format(r.from, "MMM d, yyyy");
  return `${format(r.from, "MMM d")} – ${format(r.to, "MMM d, yyyy")}`;
}

const MD =
  "text-[13px] text-slate-700 leading-relaxed " +
  "[&_h1]:text-[13.5px] [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-slate-900 " +
  "[&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:mt-2.5 [&_h2]:mb-0.5 [&_h2]:text-slate-800 " +
  "[&_h3]:text-[12.5px] [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:text-slate-800 " +
  "[&_p]:mt-1.5 [&_p]:leading-relaxed " +
  "[&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5 [&_ul]:mt-1 " +
  "[&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-0.5 [&_ol]:mt-1 " +
  "[&_strong]:font-semibold [&_strong]:text-slate-900 " +
  "[&_code]:bg-slate-100 [&_code]:rounded [&_code]:px-1 [&_code]:text-xs";

function ProjectReportPage() {
  return (
    <AppShell maxWidth="max-w-7xl">
      <RoleGate allowed={["employee", "team_lead", "manager", "admin"]}>
        <Inner />
      </RoleGate>
    </AppShell>
  );
}

type QuickKey = "today" | "yesterday" | "last7" | "last30" | "custom";

function Inner() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const today = new Date();
  const [range, setRange] = useState<DateRange | undefined>({ from: today, to: today });
  const [activeQuick, setActiveQuick] = useState<QuickKey>("today");
  const [calOpen, setCalOpen] = useState(false);
  const [project, setProject] = useState<HierarchyProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    document.title = "Project Report — Slack Autom8";
    fetchData({ from: today, to: today });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const fetchData = async (r?: DateRange) => {
    const active = r ?? range;
    setLoading(true);
    setNotFound(false);
    try {
      const params = new URLSearchParams();
      if (active?.from) params.set("from_date", format(active.from, "yyyy-MM-dd"));
      if (active?.to) params.set("to_date", format(active.to, "yyyy-MM-dd"));
      const res = await apiFetch(`/summaries/hierarchy?${params.toString()}`);
      if (!res.ok) {
        await handleApiError(res, "Failed to load report");
        setProject(null);
        setNotFound(true);
        return;
      }
      const data = (await res.json()) as HierarchyResponse;
      const found = data.projects.find((p) => p.project_id === projectId) ?? null;
      setProject(found);
      if (!found) setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const applyQuick = (key: QuickKey) => {
    setActiveQuick(key);
    const end = new Date();
    let r: DateRange;
    if (key === "today") {
      r = { from: new Date(), to: new Date() };
    } else if (key === "yesterday") {
      const y = new Date(); y.setDate(y.getDate() - 1);
      r = { from: y, to: y };
    } else if (key === "last7") {
      const s = new Date(); s.setDate(s.getDate() - 6);
      r = { from: s, to: end };
    } else {
      const s = new Date(); s.setDate(s.getDate() - 29);
      r = { from: s, to: end };
    }
    setRange(r);
    fetchData(r);
  };

  const rows = project ? flattenProject(project) : [];
  const projectCount = rows.filter((r) => r.type === "project").length;
  const personalCount = rows.filter((r) => r.type === "personal").length;

  const QUICK_PICKS: { label: string; key: QuickKey }[] = [
    { label: "Today", key: "today" },
    { label: "Yesterday", key: "yesterday" },
    { label: "Last 7 days", key: "last7" },
    { label: "Last 30 days", key: "last30" },
  ];

  const [from, to] = projectColor(project?.project_name ?? projectId);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate({ to: "/hierarchy" })}
        className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:opacity-80"
        style={{ color: "#6366f1" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All projects
      </button>

      {/* Project header banner */}
      <div
        className="rounded-2xl px-5 sm:px-8 py-5 sm:py-7 relative overflow-hidden border"
        style={{
          background: `linear-gradient(135deg, ${from}15 0%, ${to}10 55%, #f6f8fc 100%)`,
          borderColor: "#e0e7ff",
        }}
      >
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center text-white font-extrabold shrink-0"
              style={{
                background: `linear-gradient(135deg, ${from}, ${to})`,
                boxShadow: `0 6px 18px ${from}40`,
                fontSize: "16px",
              }}
            >
              {projectInitials(project?.project_name ?? "??")}
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold mb-1 truncate"
                style={{ fontSize: "24px", color: "#0f172a", letterSpacing: "-0.025em" }}>
                {project?.project_name ?? "Project Report"}
              </h1>
              <p style={{ fontSize: "13.5px", color: "#64748b" }}>
                Project and personal summaries for the selected date range.
              </p>
            </div>
          </div>
          {rows.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="rounded-xl px-3 py-2 flex items-center gap-2"
                style={{ background: "#fff", border: "1px solid #e0e7ff" }}>
                <BarChart3 className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />
                <span className="font-semibold" style={{ fontSize: "12.5px", color: "#4338ca" }}>
                  {projectCount} project
                </span>
              </div>
              <div className="rounded-xl px-3 py-2 flex items-center gap-2"
                style={{ background: "#fff", border: "1px solid #e0e7ff" }}>
                <Users className="h-3.5 w-3.5" style={{ color: "#8b5cf6" }} />
                <span className="font-semibold" style={{ fontSize: "12.5px", color: "#6d28d9" }}>
                  {personalCount} personal
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date filter bar */}
      <div
        className="rounded-2xl bg-white px-4 sm:px-5 py-3 sm:py-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-2 sm:flex-wrap"
        style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {QUICK_PICKS.map(({ label, key }) => {
            const active = activeQuick === key;
            return (
              <button key={key} type="button" onClick={() => applyQuick(key)}
                className="rounded-full px-3 sm:px-3.5 py-1.5 text-xs font-semibold transition-all min-h-[34px]"
                style={active
                  ? { background: "#6366f1", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }
                  : { background: "#f1f5f9", color: "#475569" }}>
                {label}
              </button>
            );
          })}

          <div className="hidden sm:block w-px h-5 mx-1 shrink-0" style={{ background: "#e2e8f0" }} />

          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <button type="button"
                className="inline-flex items-center gap-2 rounded-full px-3 sm:px-3.5 py-1.5 text-xs font-semibold transition-all min-h-[34px]"
                style={activeQuick === "custom"
                  ? { background: "#6366f1", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }
                  : { background: "#eef2ff", color: "#4338ca", border: "1px solid #e0e7ff" }}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {formatRange(range)}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
              <Calendar
                mode="range"
                selected={range}
                onSelect={(r) => {
                  setRange(r);
                  setActiveQuick("custom");
                  if (r?.from && r?.to) setCalOpen(false);
                }}
                numberOfMonths={isMobile ? 1 : 2}
                disabled={{ after: today }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <button type="button" onClick={() => fetchData()} disabled={loading || !range?.from}
          className="sm:ml-auto w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 min-h-[34px]"
          style={{ background: "#6366f1", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {loading ? "Loading…" : "Apply"}
        </button>
      </div>

      {/* Results */}
      {loading && !project ? (
        <div className="rounded-2xl bg-white p-16 text-center" style={{ border: "1px solid #e2e8f0" }}>
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" style={{ color: "#6366f1" }} />
          <p style={{ fontSize: "14px", color: "#64748b" }}>Loading summaries…</p>
        </div>
      ) : notFound || !project || rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-16 text-center" style={{ border: "2px dashed #e2e8f0" }}>
          <FileSearch className="h-10 w-10 mx-auto mb-3" style={{ color: "#cbd5e1" }} />
          <p className="font-semibold mb-1" style={{ fontSize: "15px", color: "#334155" }}>
            No summaries found
          </p>
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>
            Try a different date range, or generate summaries from the project page.
          </p>
          <Link
            to="/projects/$projectId"
            params={{ projectId }}
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold no-underline"
            style={{ color: "#6366f1" }}
          >
            Go to project →
          </Link>
        </div>
      ) : (
        <SummaryTable rows={rows} />
      )}
    </div>
  );
}

/* ── Summary table ── */
function SummaryTable({ rows }: { rows: FlatRow[] }) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  return (
    <div
      className="rounded-2xl bg-white overflow-hidden"
      style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.05)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[820px]">
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th className="text-left px-5 py-3 font-semibold whitespace-nowrap"
                style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase", width: "220px" }}>
                Who / Type
              </th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap"
                style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase", width: "110px" }}>
                Date
              </th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap"
                style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase", width: "90px" }}>
                Time
              </th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap"
                style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase", width: "130px" }}>
                Source
              </th>
              <th className="text-left px-4 py-3 font-semibold"
                style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Summary Preview
              </th>
              <th className="px-4 py-3" style={{ width: "60px" }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isExpanded = expandedRows.has(row.id);
              const isLast = idx === rows.length - 1;
              const preview = stripMd(row.summary_text).slice(0, 120);
              const hasMore = row.summary_text.length > 0;

              return (
                <RowItem
                  key={row.id}
                  row={row}
                  idx={idx}
                  isLast={isLast}
                  isExpanded={isExpanded}
                  preview={preview}
                  hasMore={hasMore}
                  onToggle={toggleRow}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowItem({
  row,
  idx,
  isLast,
  isExpanded,
  preview,
  hasMore,
  onToggle,
}: {
  row: FlatRow;
  idx: number;
  isLast: boolean;
  isExpanded: boolean;
  preview: string;
  hasMore: boolean;
  onToggle: (id: string) => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (hasMore && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onToggle(row.id);
    }
  };

  return (
    <>
      <tr
        role={hasMore ? "button" : undefined}
        tabIndex={hasMore ? 0 : undefined}
        aria-expanded={hasMore ? isExpanded : undefined}
        style={{
          borderBottom: isExpanded ? "none" : isLast ? "none" : "1px solid #f1f5f9",
          background: isExpanded ? "#f8f9ff" : idx % 2 === 0 ? "#fff" : "#fafbfc",
          cursor: hasMore ? "pointer" : "default",
          outline: "none",
        }}
        className={hasMore ? "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400" : ""}
        onClick={() => hasMore && onToggle(row.id)}
        onKeyDown={handleKeyDown}
      >
        <td className="px-5 py-3.5 align-top">
          {row.type === "project" ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
              style={{ background: "#eef2ff", color: "#4338ca", border: "1px solid #e0e7ff" }}>
              <BarChart3 className="h-3 w-3 shrink-0" />
              Project Summary
            </span>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, #64748b, #475569)" }}>
                {projectInitials(row.member_name ?? "?")}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate" style={{ fontSize: "12.5px", color: "#0f172a" }}>
                  {row.member_name}
                </div>
                {row.member_role === "team_lead" && (
                  <span className="text-[10px] font-semibold" style={{ color: "#6366f1" }}>Team Lead</span>
                )}
              </div>
            </div>
          )}
        </td>

        <td className="px-4 py-3.5 align-top whitespace-nowrap" style={{ fontSize: "12.5px", color: "#475569" }}>
          {format(new Date(row.date), "MMM d, yyyy")}
        </td>

        <td className="px-4 py-3.5 align-top whitespace-nowrap" style={{ fontSize: "12.5px", color: "#475569" }}>
          {format(new Date(row.created_at), "h:mm a")}
        </td>

        <td className="px-4 py-3.5 align-top">
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold w-fit"
              style={row.is_auto_generated
                ? { background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }
                : { background: "#faf5ff", color: "#7c3aed", border: "1px solid #ddd6fe" }}>
              {row.is_auto_generated
                ? <><Sparkles className="h-2.5 w-2.5" /> Auto</>
                : <><PenLine className="h-2.5 w-2.5" /> Manual</>}
            </span>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              {row.message_count} {row.message_count === 1 ? "msg" : "msgs"}
            </span>
          </div>
        </td>

        <td className="px-4 py-3.5 align-top">
          <p style={{ fontSize: "12.5px", color: "#475569", lineHeight: "1.6" }}>
            {preview}{row.summary_text.length > 120 ? "…" : ""}
          </p>
        </td>

        <td className="px-4 py-3.5 align-top text-center"
          onClick={(e) => { e.stopPropagation(); if (hasMore) onToggle(row.id); }}>
          {hasMore && (
            <button
              aria-label={isExpanded ? "Collapse summary" : "Expand summary"}
              className="inline-flex items-center justify-center h-7 w-7 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              style={{ background: isExpanded ? "#eef2ff" : "#f1f5f9" }}
            >
              {isExpanded
                ? <ChevronUp className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />
                : <ChevronDown className="h-3.5 w-3.5" style={{ color: "#94a3b8" }} />}
            </button>
          )}
        </td>
      </tr>

      {isExpanded && (
        <tr style={{ borderBottom: isLast ? "none" : "1px solid #e0e7ff" }}
          className="animate-in fade-in slide-in-from-top-1 duration-200">
          <td colSpan={6} className="px-6 pb-5 pt-2" style={{ background: "#f8f9ff" }}>
            <div className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid #e0e7ff" }}>
              <div className={MD}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.summary_text}</ReactMarkdown>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
