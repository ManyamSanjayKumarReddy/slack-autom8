import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  CalendarIcon,
  Loader2,
  FileSearch,
  BarChart3,
  RefreshCw,
  Users,
  ArrowLeft,
} from "lucide-react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { useCurrentUser } from "@/lib/user-store";
import { AppShell } from "@/components/AppShell";

import { useIsMobile } from "@/hooks/use-mobile";
import { projectColor, projectInitials } from "@/lib/project-colors";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SlackStyleFeed, type FeedRow } from "@/components/summaries/SlackStyleFeed";

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
type FlatRow = FeedRow;

function flattenProject(project: HierarchyProject): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const [date, d] of Object.entries(project.dates)) {
    for (const s of d.project_summaries) {
      rows.push({ ...s, date, type: "project", rowKey: `project-${date}-${s.id}` });
    }
    for (const m of d.members) {
      for (const s of m.personal_summaries) {
        rows.push({
          ...s,
          date,
          type: "personal",
          member_name: m.user_name,
          member_role: m.project_role,
          rowKey: `personal-${m.user_id}-${date}-${s.id}`,
        });
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

function ProjectReportPage() {
  return <Inner />;
}

type QuickKey = "today" | "yesterday" | "last7" | "last30" | "custom";

function Inner() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useCurrentUser();
  const isEmployee = user?.role === "employee";
  const today = new Date();
  const [range, setRange] = useState<DateRange | undefined>({ from: today, to: today });
  const [activeQuick, setActiveQuick] = useState<QuickKey>("today");
  const [calOpen, setCalOpen] = useState(false);
  const [project, setProject] = useState<HierarchyProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    document.title = "Project Report — Slack Autom8";
    if (user) fetchData({ from: today, to: today });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user?.role]);

  const fetchData = async (r?: DateRange) => {
    const active = r ?? range;
    setLoading(true);
    setNotFound(false);
    try {
      const params = new URLSearchParams();
      if (active?.from) params.set("from_date", format(active.from, "yyyy-MM-dd"));
      if (active?.to) params.set("to_date", format(active.to, "yyyy-MM-dd"));

      if (isEmployee) {
        // Employees: hierarchy endpoint is restricted. Use the personal-summaries
        // endpoint (server-scoped to this user) and adapt the response into the
        // HierarchyProject shape so summaries render as personal rows.
        const [sumRes, projRes] = await Promise.all([
          apiFetch(`/summaries/projects/${projectId}/personal?${params.toString()}`),
          apiFetch(`/projects/${projectId}`),
        ]);
        if (!sumRes.ok) {
          setProject(null);
          setNotFound(true);
          return;
        }
        const sumData = (await sumRes.json()) as {
          project_id: string;
          grouped_by_date: Record<string, PersonalSummary[]>;
        };
        let projectName = "Project Report";
        if (projRes.ok) {
          try {
            const p = (await projRes.json()) as { name?: string };
            if (p?.name) projectName = p.name;
          } catch {
            // ignore
          }
        }
        const memberName = user?.name || user?.email || "You";
        const memberId = user?.id || "me";
        const dates: Record<string, HierarchyDate> = {};
        for (const [date, items] of Object.entries(sumData.grouped_by_date ?? {})) {
          dates[date] = {
            project_summaries: [],
            members: [
              {
                user_id: memberId,
                user_name: memberName,
                project_role: "employee",
                personal_summaries: items,
              },
            ],
          };
        }
        const adapted: HierarchyProject = {
          project_id: projectId,
          project_name: projectName,
          dates,
        };
        setProject(adapted);
        if (Object.keys(dates).length === 0) setNotFound(true);
        return;
      }

      const res = await apiFetch(`/summaries/hierarchy?${params.toString()}`);
      if (!res.ok) {
        // Backend handles access control — just show empty state without a permission toast
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
    <AppShell title={project?.project_name ?? "Project Report"} subtitle="Summary report">
    <div className="space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate({ to: "/hierarchy" })}
        className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:opacity-80"
        style={{ color: "#1264a3" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All projects
      </button>

      {/* Project header banner */}
      <div
        className="rounded-2xl px-5 sm:px-8 py-5 sm:py-7 relative overflow-hidden border"
        style={{
          background: `linear-gradient(135deg, ${from}15 0%, ${to}10 55%, #f6f8fc 100%)`,
          borderColor: "#c8dff0",
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
                style={{ background: "#fff", border: "1px solid #c8dff0" }}>
                <BarChart3 className="h-3.5 w-3.5" style={{ color: "#1264a3" }} />
                <span className="font-semibold" style={{ fontSize: "12.5px", color: "#0b4f7e" }}>
                  {projectCount} project
                </span>
              </div>
              <div className="rounded-xl px-3 py-2 flex items-center gap-2"
                style={{ background: "#fff", border: "1px solid #c8dff0" }}>
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
                  ? { background: "#1264a3", color: "#fff", boxShadow: "0 2px 8px rgba(18,100,163,0.35)" }
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
                  ? { background: "#1264a3", color: "#fff", boxShadow: "0 2px 8px rgba(18,100,163,0.35)" }
                  : { background: "#e8f1f8", color: "#0b4f7e", border: "1px solid #c8dff0" }}>
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
          style={{ background: "#1264a3", color: "#fff", boxShadow: "0 2px 8px rgba(18,100,163,0.3)" }}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {loading ? "Loading…" : "Apply"}
        </button>
      </div>

      {/* Results */}
      {loading && !project ? (
        <div className="rounded-2xl bg-white p-16 text-center" style={{ border: "1px solid #e2e8f0" }}>
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" style={{ color: "#1264a3" }} />
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
            style={{ color: "#1264a3" }}
          >
            Go to project →
          </Link>
        </div>
      ) : (
        <SlackStyleFeed rows={rows} />
      )}
    </div>
    </AppShell>
  );
}

