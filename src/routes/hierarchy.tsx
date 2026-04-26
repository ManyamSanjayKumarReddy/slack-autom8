import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  CalendarIcon,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileSearch,
  BarChart3,
  RefreshCw,
  Sparkles,
  PenLine,
} from "lucide-react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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

/* ── Colour helpers ── */
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
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatRange(r: DateRange | undefined): string {
  if (!r?.from) return "Pick dates";
  if (!r.to || r.from.toDateString() === r.to.toDateString())
    return format(r.from, "MMM d, yyyy");
  return `${format(r.from, "MMM d")} – ${format(r.to, "MMM d, yyyy")}`;
}

const MD =
  "text-[13.5px] text-foreground leading-relaxed [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mt-2 " +
  "[&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:mt-2 [&_h3]:text-[13px] [&_h3]:font-semibold " +
  "[&_p]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5 [&_ul]:mt-1 " +
  "[&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold " +
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

function Inner() {
  const today = new Date();
  const [range, setRange] = useState<DateRange | undefined>({ from: today, to: today });
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

  const quickSet = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const r = { from: start, to: end };
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
              className="font-extrabold mb-1"
              style={{ fontSize: "24px", color: "#0f172a", letterSpacing: "-0.025em" }}
            >
              Summary Report
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b" }}>
              View all project summaries grouped by date and team member.
            </p>
          </div>
          {data && totalSummaries > 0 && (
            <div
              className="rounded-xl px-4 py-2 flex items-center gap-2"
              style={{ background: "#eef2ff", border: "1px solid #e0e7ff" }}
            >
              <BarChart3 className="h-4 w-4" style={{ color: "#6366f1" }} />
              <span className="font-semibold text-sm" style={{ color: "#4338ca" }}>
                {totalSummaries} {totalSummaries === 1 ? "summary" : "summaries"} across{" "}
                {data.projects.length} {data.projects.length === 1 ? "project" : "projects"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="rounded-2xl bg-white p-5 flex flex-col sm:flex-row sm:items-end gap-4"
        style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex-1 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#94a3b8" }}>
            Date range
          </p>
          {/* Quick picks */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Today", days: 1 },
              { label: "Yesterday", days: 0 },
              { label: "Last 7 days", days: 7 },
              { label: "Last 30 days", days: 30 },
            ].map(({ label, days }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (days === 0) {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    const r = { from: y, to: y };
                    setRange(r);
                    fetchData(r);
                  } else {
                    quickSet(days);
                  }
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                style={{ borderColor: "#e2e8f0", color: "#475569", background: "#f8fafc" }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Calendar range picker */}
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal w-full sm:w-auto",
                  !range?.from && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span>{formatRange(range)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={range}
                onSelect={(r) => {
                  setRange(r);
                  if (r?.from && r?.to) setCalOpen(false);
                }}
                numberOfMonths={2}
                disabled={{ after: today }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button
          onClick={() => fetchData()}
          disabled={loading || !range?.from}
          className="shrink-0 min-w-[100px]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {loading ? "Loading…" : "Apply"}
        </Button>
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
      ) : !data || data.projects.length === 0 ? (
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
            <ProjectNode key={p.project_id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Project card ── */
function ProjectNode({ project }: { project: HierarchyProject }) {
  const [open, setOpen] = useState(true);
  const [from, to] = projectColor(project.project_name);
  const dates = Object.keys(project.dates).sort((a, b) => (a < b ? 1 : -1));

  let count = 0;
  for (const d of Object.values(project.dates)) {
    count += d.project_summaries.length;
    for (const m of d.members) count += m.personal_summaries.length;
  }

  return (
    <div
      className="rounded-2xl bg-white overflow-hidden"
      style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)" }}
    >
      {/* Coloured top strip */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />

      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
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
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "1px" }}>
              {count} {count === 1 ? "summary" : "summaries"}
              {dates.length > 0 && (
                <>
                  {" · "}
                  {dates.length === 1
                    ? format(new Date(dates[0]), "MMM d, yyyy")
                    : `${format(new Date(dates[dates.length - 1]), "MMM d")} – ${format(new Date(dates[0]), "MMM d, yyyy")}`}
                </>
              )}
            </div>
          </div>
        </div>
        <div
          className="flex items-center justify-center h-7 w-7 rounded-lg shrink-0 transition-colors"
          style={{ background: open ? "#eef2ff" : "#f8fafc", border: "1px solid #e2e8f0" }}
        >
          {open ? (
            <ChevronDown className="h-4 w-4" style={{ color: "#6366f1" }} />
          ) : (
            <ChevronRight className="h-4 w-4" style={{ color: "#94a3b8" }} />
          )}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid #f1f5f9" }}>
          {dates.map((d, i) => (
            <DateSection
              key={d}
              date={d}
              data={project.dates[d]}
              isLast={i === dates.length - 1}
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
}: {
  date: string;
  data: HierarchyDate;
  isLast: boolean;
}) {
  const sortedMembers = [...data.members]
    .filter((m) => m.personal_summaries.length > 0)
    .sort((a, b) => {
      if (a.project_role !== b.project_role)
        return a.project_role === "team_lead" ? -1 : 1;
      return a.user_name.localeCompare(b.user_name);
    });

  return (
    <div
      className="px-5 py-5"
      style={{ borderBottom: isLast ? "none" : "1px solid #f1f5f9" }}
    >
      {/* Date label */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="font-bold uppercase tracking-wider"
          style={{ fontSize: "11px", color: "#6366f1" }}
        >
          {format(new Date(date), "EEEE, MMMM d, yyyy")}
        </span>
        <div className="flex-1 h-px" style={{ background: "#e0e7ff" }} />
      </div>

      <div className="space-y-3">
        {/* Project-level summaries */}
        {data.project_summaries.map((s) => (
          <SummaryCard key={s.id} summary={s} type="project" />
        ))}

        {/* Member summaries */}
        {sortedMembers.map((m) =>
          m.personal_summaries.map((s) => (
            <SummaryCard key={s.id} summary={s} type="personal" member={m} />
          )),
        )}

        {data.project_summaries.length === 0 && sortedMembers.length === 0 && (
          <p style={{ fontSize: "13px", color: "#94a3b8" }} className="italic">
            No summaries for this date.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Summary card ── */
function SummaryCard({
  summary,
  type,
  member,
}: {
  summary: PersonalSummary;
  type: "project" | "personal";
  member?: HierarchyMember;
}) {
  const [expanded, setExpanded] = useState(false);
  const text = summary.summary_text || "";
  const isLong = text.length > 500;
  const display = expanded || !isLong ? text : text.slice(0, 500) + "…";

  const isProject = type === "project";
  const accentColor = isProject ? "#6366f1" : "#64748b";
  const bgColor = isProject ? "#f5f7ff" : "#fafafa";
  const borderColor = isProject ? "#e0e7ff" : "#e2e8f0";

  const memberInitials = member
    ? nameInitials(member.user_name)
    : null;

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          {isProject ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold"
              style={{ background: "#eef2ff", color: "#4338ca", border: "1px solid #e0e7ff" }}
            >
              <BarChart3 className="h-3 w-3" />
              Project Summary
            </span>
          ) : memberInitials ? (
            <div className="flex items-center gap-2">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, #64748b, #475569)" }}
              >
                {memberInitials}
              </div>
              <span className="font-semibold text-sm" style={{ color: "#0f172a" }}>
                {member!.user_name}
              </span>
              {member!.project_role === "team_lead" && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "#eef2ff", color: "#4338ca", border: "1px solid #e0e7ff" }}
                >
                  Team Lead
                </span>
              )}
            </div>
          ) : null}

          {/* Metadata badges */}
          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
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
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              · {summary.message_count} msg
            </span>
          </div>
        </div>
      </div>

      {/* Summary content */}
      <div style={{ color: accentColor }}>
        <div className={MD}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{display}</ReactMarkdown>
        </div>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs font-semibold hover:underline"
            style={{ color: "#6366f1" }}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}
