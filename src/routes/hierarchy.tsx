import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileSearch,
} from "lucide-react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { StructuredProjectSummary } from "@/components/summaries/StructuredProjectSummary";

export const Route = createFileRoute("/hierarchy")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: HierarchyPage,
});

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

function HierarchyPage() {
  return (
    <AppShell
      title="Summary Report"
      subtitle="View all project summaries by date."
      maxWidth="max-w-7xl"
    >
      <RoleGate allowed={["manager", "admin"]}>
        <Inner />
      </RoleGate>
    </AppShell>
  );
}

function Inner() {
  const today = new Date();
  const [fromDate, setFromDate] = useState<Date | undefined>(today);
  const [toDate, setToDate] = useState<Date | undefined>(today);
  const [data, setData] = useState<HierarchyResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Summary Report — Slack Summarizer";
    fetchData(today, today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async (from?: Date, to?: Date) => {
    const f = from ?? fromDate;
    const t = to ?? toDate;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f) params.set("from_date", format(f, "yyyy-MM-dd"));
      if (t) params.set("to_date", format(t, "yyyy-MM-dd"));
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

  const handleToday = () => {
    const t = new Date();
    setFromDate(t);
    setToDate(t);
    fetchData(t, t);
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
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-w-0">
            <DateField
              label="From"
              value={fromDate}
              onChange={setFromDate}
              id="h-from"
            />
            <DateField label="To" value={toDate} onChange={setToDate} id="h-to" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleToday}
              disabled={loading}
              className="min-h-[44px]"
            >
              Today
            </Button>
            <Button
              onClick={() => fetchData()}
              disabled={loading}
              className="min-h-[44px]"
            >
              {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Apply
            </Button>
          </div>
        </div>
        {data && data.projects.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            {totalSummaries} total{" "}
            {totalSummaries === 1 ? "summary" : "summaries"} across{" "}
            {data.projects.length}{" "}
            {data.projects.length === 1 ? "project" : "projects"}
          </div>
        )}
      </section>

      {loading && !data ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : !data || data.projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <FileSearch className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            No summaries found for this date range
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different date or generate a summary from a project page.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.projects.map((p) => (
            <ProjectNode key={p.project_id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  id: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "justify-start text-left font-normal w-full min-h-[44px]",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {value ? format(value, "PPP") : "Pick a date"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ProjectNode({ project }: { project: HierarchyProject }) {
  const [open, setOpen] = useState(true);
  const dates = Object.keys(project.dates).sort((a, b) => (a < b ? 1 : -1));

  let count = 0;
  for (const d of Object.values(project.dates)) {
    count += d.project_summaries.length;
    for (const m of d.members) count += m.personal_summaries.length;
  }

  const dateRangeLabel =
    dates.length === 0
      ? ""
      : dates.length === 1
        ? format(new Date(dates[0]), "MMM d, yyyy")
        : `${format(new Date(dates[dates.length - 1]), "MMM d")} – ${format(new Date(dates[0]), "MMM d, yyyy")}`;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 hover:bg-secondary/30 transition-colors min-h-[56px]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          <div className="min-w-0 text-left">
            <div className="text-base sm:text-lg font-semibold text-foreground truncate">
              {project.project_name}
            </div>
            {dateRangeLabel && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {dateRangeLabel}
              </div>
            )}
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">
          {count} {count === 1 ? "summary" : "summaries"}
        </Badge>
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {dates.map((d) => (
            <DateNode key={d} date={d} data={project.dates[d]} />
          ))}
        </div>
      )}
    </div>
  );
}

function DateNode({ date, data }: { date: string; data: HierarchyDate }) {
  const [open, setOpen] = useState(true);
  const sortedMembers = [...data.members].sort((a, b) => {
    if (a.project_role !== b.project_role) {
      return a.project_role === "team_lead" ? -1 : 1;
    }
    return a.user_name.localeCompare(b.user_name);
  });

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-3 hover:bg-secondary/30 transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground truncate">
            {format(new Date(date), "EEEE, MMMM d, yyyy")}
          </span>
        </div>
      </button>
      {open && (
        <div className="px-4 sm:px-6 pb-4 space-y-3">
          {data.project_summaries.length > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 sm:p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                  Project Summary
                </Badge>
              </div>
              {data.project_summaries.map((s) => (
                <ProjectSummaryBlock key={s.id} summary={s} />
              ))}
            </div>
          )}
          {sortedMembers.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-1">
              No member activity for this date.
            </div>
          ) : (
            sortedMembers.map((m) => <MemberNode key={m.user_id} member={m} />)
          )}
        </div>
      )}
    </div>
  );
}

function MemberNode({ member }: { member: HierarchyMember }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-secondary/20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2.5 hover:bg-secondary/40 transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground truncate">
            {member.user_name}
          </span>
          <Badge
            variant="outline"
            className={
              member.project_role === "team_lead"
                ? "text-[10px] border-primary/40 bg-primary/10 text-primary"
                : "text-[10px]"
            }
          >
            {member.project_role === "team_lead" ? "Team Lead" : "Employee"}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground sm:ml-auto pl-5 sm:pl-0">
          {member.personal_summaries.length}{" "}
          {member.personal_summaries.length === 1 ? "summary" : "summaries"}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {member.personal_summaries.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">
              No summaries this day.
            </div>
          ) : (
            member.personal_summaries.map((s) => (
              <PersonalSummaryBlock key={s.id} summary={s} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SummaryMeta({ summary }: { summary: PersonalSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {summary.user_name && (
        <span className="font-medium text-foreground">{summary.user_name}</span>
      )}
      <Badge
        variant="outline"
        className={
          summary.is_auto_generated
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400"
        }
      >
        {summary.is_auto_generated ? "Auto" : "Manual"}
      </Badge>
      <span>{summary.message_count} messages</span>
      <span>{format(new Date(summary.created_at), "h:mm a")}</span>
    </div>
  );
}

function ProjectSummaryBlock({ summary }: { summary: PersonalSummary }) {
  return (
    <div className="rounded-md bg-card border border-border p-3 space-y-2">
      <SummaryMeta summary={summary} />
      <StructuredProjectSummary text={summary.summary_text || ""} />
    </div>
  );
}

function PersonalSummaryBlock({ summary }: { summary: PersonalSummary }) {
  const [expanded, setExpanded] = useState(false);
  const text = summary.summary_text || "";
  const isLong = text.length > 240;
  const display = expanded || !isLong ? text : text.slice(0, 240) + "…";
  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-1.5">
      <SummaryMeta summary={summary} />
      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
        {display}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
