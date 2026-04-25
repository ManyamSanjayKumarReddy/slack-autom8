import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
    <AppShell title="Summary Report" subtitle="All projects, dates, and summaries.">
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
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from_date", format(fromDate, "yyyy-MM-dd"));
      if (toDate) params.set("to_date", format(toDate, "yyyy-MM-dd"));
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

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[var(--shadow-card)] flex items-end gap-3 flex-wrap">
        <DateField label="From" value={fromDate} onChange={setFromDate} id="h-from" />
        <DateField label="To" value={toDate} onChange={setToDate} id="h-to" />
        <Button onClick={fetchData} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Apply
        </Button>
      </section>

      {loading && !data ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : !data || data.projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No summaries in this date range.
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "justify-start text-left font-normal w-[180px]",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP") : "Pick a date"}
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

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="text-base font-semibold text-foreground truncate">
            {project.project_name}
          </span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {dates.length} {dates.length === 1 ? "day" : "days"}
        </span>
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
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-3 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <span className="text-sm font-medium text-foreground">
            {format(new Date(date), "EEEE, MMM d, yyyy")}
          </span>
        </div>
      </button>
      {open && (
        <div className="px-4 sm:px-6 pb-4 space-y-3">
          {data.project_summaries.length > 0 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                Project Summary
              </div>
              {data.project_summaries.map((s) => (
                <SummaryBlock key={s.id} summary={s} />
              ))}
            </div>
          )}
          {sortedMembers.map((m) => (
            <MemberNode key={m.user_id} member={m} />
          ))}
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
        className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <span className="text-sm font-medium text-foreground">{member.user_name}</span>
          <Badge variant="outline" className="text-[10px]">
            {member.project_role === "team_lead" ? "Team Lead" : "Employee"}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {member.personal_summaries.length}{" "}
          {member.personal_summaries.length === 1 ? "summary" : "summaries"}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {member.personal_summaries.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">No summaries this day.</div>
          ) : (
            member.personal_summaries.map((s) => <SummaryBlock key={s.id} summary={s} />)
          )}
        </div>
      )}
    </div>
  );
}

function SummaryBlock({ summary }: { summary: PersonalSummary }) {
  const [expanded, setExpanded] = useState(false);
  const text = summary.summary_text || "";
  const isLong = text.length > 240;
  const display = expanded || !isLong ? text : text.slice(0, 240) + "…";

  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-1.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
      <div className="text-sm text-foreground leading-relaxed [&_p]:mt-1 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-semibold">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{display}</ReactMarkdown>
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
