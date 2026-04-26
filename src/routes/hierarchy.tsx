import { createFileRoute, redirect } from "@tanstack/react-router";
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
} from "lucide-react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/hierarchy")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: HierarchyPage,
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

/* ── Helpers ── */
const PROJECT_GRADIENTS = [
  ["#8b5cf6", "#6366f1"],
  ["#3b82f6", "#2563eb"],
  ["#10b981", "#0d9488"],
  ["#f59e0b", "#d97706"],
  ["#ec4899", "#db2777"],
  ["#14b8a6", "#0891b2"],
  ["#f97316", "#ea580c"],
  ["#84cc16", "#16a34a"],
];
function projectColor(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PROJECT_GRADIENTS[h % PROJECT_GRADIENTS.length] as [string, string];
}
function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
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

/* ── Page ── */
function HierarchyPage() {
  return (
    <AppShell maxWidth="max-w-6xl">
      <RoleGate allowed={["manager", "admin"]}>
        <Inner />
      </RoleGate>
    </AppShell>
  );
}

type QuickKey = "today" | "yesterday" | "last7" | "last30" | "custom";

function Inner() {
  const today = new Date();
  const [range, setRange] = useState<DateRange | undefined>({ from: today, to: today });
  const [activeQuick, setActiveQuick] = useState<QuickKey>("today");
  const [calOpen, setCalOpen] = useState(false);
  const [data, setData] = useState<HierarchyResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Summary Report — Slack Autom8";
    fetchData({ from: today, to: today });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async (r?: DateRange) => {
    const active = r ?? range;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (active?.from) params.set("from_date", format(active.from, "yyyy-MM-dd"));
      if (active?.to) params.set("to_date", format(active.to, "yyyy-MM-dd"));
      const res = await apiFetch(`/summaries/hierarchy?${params.toString()}`);
      if (!res.ok) {
        await handleApiError(res, "Failed to load hierarchy");
        setData({ projects: [] });
        return;
      }
      setData(await res.json());
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

  const projectsWithData = data?.projects.filter((p) => flattenProject(p).length > 0) ?? [];
  const totalSummaries = projectsWithData.reduce((a, p) => a + flattenProject(p).length, 0);

  const QUICK_PICKS: { label: string; key: QuickKey }[] = [
    { label: "Today", key: "today" },
    { label: "Yesterday", key: "yesterday" },
    { label: "Last 7 days", key: "last7" },
    { label: "Last 30 days", key: "last30" },
  ];

  return (
    <div className="space-y-8">
      {/* Page header banner */}
      <div
        className="rounded-2xl px-8 py-7 relative overflow-hidden border"
        style={{
          background: "linear-gradient(135deg, #eef2ff 0%, #f5f7ff 55%, #f6f8fc 100%)",
          borderColor: "#e0e7ff",
        }}
      >
        <div className="absolute right-[-40px] top-[-50px] h-[200px] w-[200px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)" }} />
        <div className="absolute right-[60px] bottom-[-30px] h-[120px] w-[120px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)" }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-extrabold mb-1.5" style={{ fontSize: "24px", color: "#0f172a", letterSpacing: "-0.025em" }}>
              Summary Report
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b" }}>
              Project and personal summaries grouped by project.
            </p>
          </div>
          {totalSummaries > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="rounded-xl px-3.5 py-2 flex items-center gap-2"
                style={{ background: "#fff", border: "1px solid #e0e7ff" }}>
                <BarChart3 className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />
                <span className="font-semibold" style={{ fontSize: "13px", color: "#4338ca" }}>
                  {totalSummaries} {totalSummaries === 1 ? "summary" : "summaries"}
                </span>
              </div>
              <div className="rounded-xl px-3.5 py-2 flex items-center gap-2"
                style={{ background: "#fff", border: "1px solid #e0e7ff" }}>
                <Users className="h-3.5 w-3.5" style={{ color: "#8b5cf6" }} />
                <span className="font-semibold" style={{ fontSize: "13px", color: "#6d28d9" }}>
                  {projectsWithData.length} {projectsWithData.length === 1 ? "project" : "projects"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compact date filter bar */}
      <div
        className="rounded-2xl bg-white px-5 py-4 flex items-center gap-2 flex-wrap"
        style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {QUICK_PICKS.map(({ label, key }) => {
          const active = activeQuick === key;
          return (
            <button key={key} type="button" onClick={() => applyQuick(key)}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
              style={active
                ? { background: "#6366f1", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }
                : { background: "#f1f5f9", color: "#475569" }}>
              {label}
            </button>
          );
        })}

        <div className="w-px h-5 mx-1 shrink-0" style={{ background: "#e2e8f0" }} />

        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <button type="button"
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
              style={activeQuick === "custom"
                ? { background: "#6366f1", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }
                : { background: "#eef2ff", color: "#4338ca", border: "1px solid #e0e7ff" }}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {formatRange(range)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={range}
              onSelect={(r) => {
                setRange(r);
                setActiveQuick("custom");
                if (r?.from && r?.to) setCalOpen(false);
              }}
              numberOfMonths={2}
              disabled={{ after: today }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <button type="button" onClick={() => fetchData()} disabled={loading || !range?.from}
          className="ml-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all disabled:opacity-50"
          style={{ background: "#6366f1", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {loading ? "Loading…" : "Apply"}
        </button>
      </div>

      {/* Results */}
      {loading && !data ? (
        <div className="rounded-2xl bg-white p-16 text-center" style={{ border: "1px solid #e2e8f0" }}>
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" style={{ color: "#6366f1" }} />
          <p style={{ fontSize: "14px", color: "#64748b" }}>Loading summaries…</p>
        </div>
      ) : projectsWithData.length === 0 ? (
        <div className="rounded-2xl bg-white p-16 text-center" style={{ border: "2px dashed #e2e8f0" }}>
          <FileSearch className="h-10 w-10 mx-auto mb-3" style={{ color: "#cbd5e1" }} />
          <p className="font-semibold mb-1" style={{ fontSize: "15px", color: "#334155" }}>No summaries found</p>
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>
            Try a different date range, or generate summaries from a project page.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {projectsWithData.map((p) => (
            <ProjectBlock key={p.project_id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Project block with summary table ── */
function ProjectBlock({ project }: { project: HierarchyProject }) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [from, to] = projectColor(project.project_name);
  const rows = flattenProject(project);

  const projectCount = rows.filter((r) => r.type === "project").length;
  const personalCount = rows.filter((r) => r.type === "personal").length;

  const toggleRow = (id: string) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div
      className="rounded-2xl bg-white overflow-hidden"
      style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.05)" }}
    >
      {/* Coloured top strip */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />

      {/* Project header */}
      <div
        className="flex items-center gap-4 px-6 py-4 cursor-pointer select-none"
        style={{ background: "#fafbff", borderBottom: "1px solid #f1f5f9" }}
        onClick={() => setCollapsed((v) => !v)}
      >
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center text-white text-sm font-extrabold shrink-0"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 4px 10px ${from}40` }}
        >
          {initials(project.project_name)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold truncate" style={{ fontSize: "15px", color: "#0f172a", letterSpacing: "-0.01em" }}>
            {project.project_name}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {projectCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: "#eef2ff", color: "#4338ca", border: "1px solid #e0e7ff" }}>
                <BarChart3 className="h-2.5 w-2.5" /> {projectCount} project {projectCount === 1 ? "summary" : "summaries"}
              </span>
            )}
            {personalCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" }}>
                <Users className="h-2.5 w-2.5" /> {personalCount} personal {personalCount === 1 ? "summary" : "summaries"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-center h-7 w-7 rounded-lg shrink-0"
          style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
          {collapsed
            ? <ChevronRight className="h-4 w-4" style={{ color: "#94a3b8" }} />
            : <ChevronDown className="h-4 w-4" style={{ color: "#6366f1" }} />}
        </div>
      </div>

      {/* Summary table */}
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th className="text-left px-5 py-3 font-semibold whitespace-nowrap" style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase", width: "220px" }}>
                  Who / Type
                </th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase", width: "110px" }}>
                  Date
                </th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase", width: "90px" }}>
                  Time
                </th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase", width: "130px" }}>
                  Source
                </th>
                <th className="text-left px-4 py-3 font-semibold" style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase" }}>
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
                  <>
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: isExpanded ? "none" : isLast ? "none" : "1px solid #f1f5f9",
                        background: isExpanded ? "#f8f9ff" : idx % 2 === 0 ? "#fff" : "#fafbfc",
                        cursor: hasMore ? "pointer" : "default",
                      }}
                      onClick={() => hasMore && toggleRow(row.id)}
                    >
                      {/* Who / Type */}
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
                              {initials(row.member_name ?? "?")}
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

                      {/* Date */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap" style={{ fontSize: "12.5px", color: "#475569" }}>
                        {format(new Date(row.date), "MMM d, yyyy")}
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap" style={{ fontSize: "12.5px", color: "#475569" }}>
                        {format(new Date(row.created_at), "h:mm a")}
                      </td>

                      {/* Source */}
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

                      {/* Preview */}
                      <td className="px-4 py-3.5 align-top">
                        <p style={{ fontSize: "12.5px", color: "#475569", lineHeight: "1.6" }}>
                          {preview}{row.summary_text.length > 120 ? "…" : ""}
                        </p>
                      </td>

                      {/* Toggle */}
                      <td className="px-4 py-3.5 align-top text-center" onClick={(e) => { e.stopPropagation(); hasMore && toggleRow(row.id); }}>
                        {hasMore && (
                          <button
                            className="inline-flex items-center justify-center h-6 w-6 rounded-full transition-colors"
                            style={{ background: isExpanded ? "#eef2ff" : "#f1f5f9" }}
                          >
                            {isExpanded
                              ? <ChevronUp className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />
                              : <ChevronDown className="h-3.5 w-3.5" style={{ color: "#94a3b8" }} />}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded content row */}
                    {isExpanded && (
                      <tr key={`${row.id}-expanded`} style={{ borderBottom: isLast ? "none" : "1px solid #e0e7ff" }}>
                        <td colSpan={6} className="px-6 pb-5 pt-0" style={{ background: "#f8f9ff" }}>
                          <div
                            className="rounded-xl p-4"
                            style={{ background: "#fff", border: "1px solid #e0e7ff" }}
                          >
                            <div className={MD}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.summary_text}</ReactMarkdown>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
