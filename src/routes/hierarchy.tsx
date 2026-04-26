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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  user_name?: string;
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
  from_date?: string;
  to_date?: string;
  projects: HierarchyProject[];
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
function nameInitials(name: string) {
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
function formatRange(r: DateRange | undefined): string {
  if (!r?.from) return "Pick dates";
  if (!r.to || r.from.toDateString() === r.to.toDateString())
    return format(r.from, "MMM d, yyyy");
  if (r.from.getFullYear() === r.to.getFullYear())
    return `${format(r.from, "MMM d")} – ${format(r.to, "MMM d, yyyy")}`;
  return `${format(r.from, "MMM d, yyyy")} – ${format(r.to, "MMM d, yyyy")}`;
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
    let r: DateRange;
    const end = new Date();
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

  const totalSummaries =
    data?.projects.reduce((acc, p) => {
      let c = 0;
      for (const d of Object.values(p.dates)) {
        c += d.project_summaries.length;
        for (const m of d.members) c += m.personal_summaries.length;
      }
      return acc + c;
    }, 0) ?? 0;

  const totalProjects = data?.projects.filter((p) => {
    for (const d of Object.values(p.dates)) {
      if (d.project_summaries.length > 0) return true;
      if (d.members.some((m) => m.personal_summaries.length > 0)) return true;
    }
    return false;
  }).length ?? 0;

  const QUICK_PICKS: { label: string; key: QuickKey }[] = [
    { label: "Today", key: "today" },
    { label: "Yesterday", key: "yesterday" },
    { label: "Last 7 days", key: "last7" },
    { label: "Last 30 days", key: "last30" },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div
        className="rounded-2xl px-8 py-7 relative overflow-hidden border"
        style={{
          background: "linear-gradient(135deg, #eef2ff 0%, #f5f7ff 55%, #f6f8fc 100%)",
          borderColor: "#e0e7ff",
        }}
      >
        <div
          className="absolute right-[-40px] top-[-50px] h-[200px] w-[200px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)" }}
        />
        <div
          className="absolute right-[60px] bottom-[-30px] h-[120px] w-[120px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)" }}
        />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="font-extrabold mb-1.5"
              style={{ fontSize: "24px", color: "#0f172a", letterSpacing: "-0.025em" }}
            >
              Summary Report
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b" }}>
              Project and personal summaries grouped by team and date.
            </p>
          </div>
          {data && totalSummaries > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="rounded-xl px-3.5 py-2 flex items-center gap-2"
                style={{ background: "#fff", border: "1px solid #e0e7ff" }}
              >
                <BarChart3 className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />
                <span className="font-semibold" style={{ fontSize: "13px", color: "#4338ca" }}>
                  {totalSummaries} {totalSummaries === 1 ? "summary" : "summaries"}
                </span>
              </div>
              <div
                className="rounded-xl px-3.5 py-2 flex items-center gap-2"
                style={{ background: "#fff", border: "1px solid #e0e7ff" }}
              >
                <Users className="h-3.5 w-3.5" style={{ color: "#8b5cf6" }} />
                <span className="font-semibold" style={{ fontSize: "13px", color: "#6d28d9" }}>
                  {totalProjects} {totalProjects === 1 ? "project" : "projects"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Compact date filter bar ── */}
      <div
        className="rounded-2xl bg-white px-5 py-4 flex items-center gap-2 flex-wrap"
        style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {/* Quick picks */}
        {QUICK_PICKS.map(({ label, key }) => {
          const active = activeQuick === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => applyQuick(key)}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
              style={
                active
                  ? { background: "#6366f1", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }
                  : { background: "#f1f5f9", color: "#475569" }
              }
            >
              {label}
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px h-5 mx-1 shrink-0" style={{ background: "#e2e8f0" }} />

        {/* Calendar date picker */}
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
              style={
                activeQuick === "custom"
                  ? { background: "#6366f1", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }
                  : { background: "#eef2ff", color: "#4338ca", border: "1px solid #e0e7ff" }
              }
            >
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

        {/* Apply — only visible for custom, or as a manual refresh */}
        <button
          type="button"
          onClick={() => fetchData()}
          disabled={loading || !range?.from}
          className="ml-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all disabled:opacity-50"
          style={{ background: "#6366f1", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {loading ? "Loading…" : "Apply"}
        </button>
      </div>

      {/* Results */}
      {loading && !data ? (
        <div
          className="rounded-2xl bg-white p-16 text-center"
          style={{ border: "1px solid #e2e8f0" }}
        >
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" style={{ color: "#6366f1" }} />
          <p style={{ fontSize: "14px", color: "#64748b" }}>Loading summaries…</p>
        </div>
      ) : !data || data.projects.length === 0 || totalSummaries === 0 ? (
        <div
          className="rounded-2xl bg-white p-16 text-center"
          style={{ border: "2px dashed #e2e8f0" }}
        >
          <FileSearch className="h-10 w-10 mx-auto mb-3" style={{ color: "#cbd5e1" }} />
          <p className="font-semibold mb-1" style={{ fontSize: "15px", color: "#334155" }}>
            No summaries found
          </p>
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>
            Try a different date range, or generate summaries from a project page.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.projects.map((p) => (
            <ProjectNode key={p.project_id} project={p} loading={loading} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Project accordion ── */
function ProjectNode({ project, loading }: { project: HierarchyProject; loading: boolean }) {
  const [open, setOpen] = useState(true);
  const [from, to] = projectColor(project.project_name);
  const dates = Object.keys(project.dates).sort((a, b) => (a < b ? 1 : -1));

  let total = 0;
  let personalCount = 0;
  let projectCount = 0;
  for (const d of Object.values(project.dates)) {
    projectCount += d.project_summaries.length;
    for (const m of d.members) personalCount += m.personal_summaries.length;
  }
  total = projectCount + personalCount;

  if (total === 0) return null;

  return (
    <div
      className="rounded-2xl bg-white overflow-hidden"
      style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)" }}
    >
      {/* Colored top strip */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />

      {/* Accordion header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 transition-colors"
        style={{ background: open ? "#fafbff" : "#fff" }}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-extrabold shrink-0"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 3px 8px ${from}40` }}
          >
            {nameInitials(project.project_name)}
          </div>
          <div className="min-w-0 text-left">
            <div
              className="font-bold truncate"
              style={{ fontSize: "15px", color: "#0f172a", letterSpacing: "-0.01em" }}
            >
              {project.project_name}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {projectCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "#eef2ff", color: "#4338ca", border: "1px solid #e0e7ff" }}
                >
                  <BarChart3 className="h-2.5 w-2.5" />
                  {projectCount} project
                </span>
              )}
              {personalCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" }}
                >
                  <Users className="h-2.5 w-2.5" />
                  {personalCount} personal
                </span>
              )}
              {dates.length > 0 && (
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  {dates.length === 1
                    ? format(new Date(dates[0]), "MMM d, yyyy")
                    : `${format(new Date(dates[dates.length - 1]), "MMM d")} – ${format(new Date(dates[0]), "MMM d, yyyy")}`}
                </span>
              )}
            </div>
          </div>
        </div>
        <div
          className="flex items-center justify-center h-7 w-7 rounded-lg shrink-0 transition-colors"
          style={{ background: open ? "#eef2ff" : "#f1f5f9", border: "1px solid #e2e8f0" }}
        >
          {open ? (
            <ChevronDown className="h-4 w-4" style={{ color: "#6366f1" }} />
          ) : (
            <ChevronRight className="h-4 w-4" style={{ color: "#94a3b8" }} />
          )}
        </div>
      </button>

      {/* Content */}
      {open && (
        <div style={{ borderTop: "1px solid #f1f5f9" }}>
          {dates.map((d, i) => (
            <DateSection
              key={d}
              date={d}
              data={project.dates[d]}
              isLast={i === dates.length - 1}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Date section ── */
function DateSection({
  date,
  data,
  isLast,
  loading,
}: {
  date: string;
  data: HierarchyDate;
  isLast: boolean;
  loading: boolean;
}) {
  const sortedMembers = [...data.members]
    .filter((m) => m.personal_summaries.length > 0)
    .sort((a, b) => {
      if (a.project_role !== b.project_role) return a.project_role === "team_lead" ? -1 : 1;
      return a.user_name.localeCompare(b.user_name);
    });

  const totalInDate =
    data.project_summaries.length +
    sortedMembers.reduce((s, m) => s + m.personal_summaries.length, 0);

  if (totalInDate === 0) return null;

  return (
    <div
      className="px-5 py-5"
      style={{ borderBottom: isLast ? "none" : "1px solid #f1f5f9" }}
    >
      {/* Date label */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="font-bold uppercase tracking-wider shrink-0"
          style={{ fontSize: "10.5px", color: "#6366f1" }}
        >
          {format(new Date(date), "EEE, MMM d, yyyy")}
        </span>
        <div className="flex-1 h-px" style={{ background: "#e0e7ff" }} />
        <span
          className="rounded-full px-2 py-0.5 shrink-0"
          style={{ fontSize: "10px", background: "#eef2ff", color: "#6366f1", fontWeight: 600 }}
        >
          {totalInDate}
        </span>
      </div>

      <div className="space-y-2">
        {/* Project-level summaries */}
        {data.project_summaries.map((s) => (
          <SummaryItem key={s.id} summary={s} type="project" />
        ))}

        {/* Member summaries — grouped by member */}
        {sortedMembers.map((m) => (
          <MemberGroup key={m.user_id} member={m} loading={loading} />
        ))}
      </div>
    </div>
  );
}

/* ── Member group (compact, collapsible) ── */
function MemberGroup({ member, loading: _loading }: { member: HierarchyMember; loading: boolean }) {
  const [open, setOpen] = useState(true);
  const count = member.personal_summaries.length;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
      {/* Member header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
        style={{ background: open ? "#f8fafc" : "#fff" }}
      >
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
          style={{ background: "linear-gradient(135deg, #64748b, #475569)" }}
        >
          {nameInitials(member.user_name)}
        </div>
        <span className="font-semibold flex-1 truncate" style={{ fontSize: "13px", color: "#0f172a" }}>
          {member.user_name}
        </span>
        {member.project_role === "team_lead" && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
            style={{ background: "#eef2ff", color: "#4338ca", border: "1px solid #e0e7ff" }}
          >
            Team Lead
          </span>
        )}
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
          style={{ background: "#f1f5f9", color: "#64748b" }}
        >
          {count} {count === 1 ? "summary" : "summaries"}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0" style={{ color: "#94a3b8" }} />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: "#94a3b8" }} />
        )}
      </button>

      {open && (
        <div className="divide-y" style={{ borderTop: "1px solid #f1f5f9", borderColor: "#f1f5f9" }}>
          {member.personal_summaries.map((s) => (
            <SummaryItem key={s.id} summary={s} type="personal" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Summary item (compact, expand on click) ── */
function SummaryItem({
  summary,
  type,
}: {
  summary: PersonalSummary;
  type: "project" | "personal";
}) {
  const [expanded, setExpanded] = useState(false);
  const text = summary.summary_text || "";
  const preview = stripMd(text).slice(0, 180);
  const isLong = text.length > 0;

  const isProject = type === "project";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: isProject ? "1px solid #e0e7ff" : undefined,
        background: isProject ? "#f8f9ff" : undefined,
      }}
    >
      {/* Compact header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 flex-wrap"
        style={!isProject ? { borderBottom: expanded ? "1px solid #f1f5f9" : "none" } : {}}
      >
        {isProject && (
          <span
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold shrink-0"
            style={{ background: "#eef2ff", color: "#4338ca", border: "1px solid #e0e7ff" }}
          >
            <BarChart3 className="h-3 w-3" />
            Project
          </span>
        )}

        {/* Auto/Manual badge */}
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
          style={
            summary.is_auto_generated
              ? { background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }
              : { background: "#faf5ff", color: "#7c3aed", border: "1px solid #ddd6fe" }
          }
        >
          {summary.is_auto_generated ? (
            <><Sparkles className="h-2.5 w-2.5" /> Auto</>
          ) : (
            <><PenLine className="h-2.5 w-2.5" /> Manual</>
          )}
        </span>

        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
          {format(new Date(summary.created_at), "h:mm a")}
        </span>
        <span style={{ fontSize: "11px", color: "#cbd5e1" }}>·</span>
        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
          {summary.message_count} {summary.message_count === 1 ? "msg" : "msgs"}
        </span>

        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all shrink-0"
            style={{ background: "#f1f5f9", color: "#475569" }}
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3" /> Less</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> More</>
            )}
          </button>
        )}
      </div>

      {/* Preview (collapsed) */}
      {!expanded && preview && (
        <div
          className="px-4 pb-3"
          style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6" }}
        >
          {preview}{text.length > 180 ? "…" : ""}
        </div>
      )}

      {/* Full content (expanded) */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className={MD}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
