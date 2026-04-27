import { useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Sparkles, PenLine, BarChart3 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { projectInitials } from "@/lib/project-colors";

export interface FeedRow {
  id: string;
  rowKey: string;
  date: string;           // yyyy-MM-dd bucket
  created_at: string;     // ISO
  summary_text: string;
  message_count: number;
  is_auto_generated?: boolean;
  type: "project" | "personal";
  member_name?: string;
  member_role?: "employee" | "team_lead";
}

const MD =
  "text-[14px] text-slate-700 leading-relaxed " +
  "[&_h1]:text-[14.5px] [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-slate-900 " +
  "[&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:mt-2.5 [&_h2]:mb-0.5 [&_h2]:text-slate-800 " +
  "[&_h3]:text-[13.5px] [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:text-slate-800 " +
  "[&_p]:mt-1.5 [&_p]:leading-relaxed " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5 [&_ul]:mt-1 " +
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-0.5 [&_ol]:mt-1 " +
  "[&_strong]:font-semibold [&_strong]:text-slate-900 " +
  "[&_a]:text-indigo-600 [&_a]:underline " +
  "[&_code]:bg-slate-100 [&_code]:rounded [&_code]:px-1 [&_code]:text-[12.5px]";

function fmtDateBucket(d: string): string {
  try {
    const dt = new Date(d);
    if (isToday(dt)) return "Today";
    if (isYesterday(dt)) return "Yesterday";
    return format(dt, "EEEE, MMMM d");
  } catch {
    return d;
  }
}

function avatarFor(row: FeedRow): { letters: string; gradient: string } {
  if (row.type === "project") {
    return {
      letters: projectInitials(row.member_name ?? "PJ"),
      gradient: "linear-gradient(135deg, #6366f1, #4f46e5)",
    };
  }
  return {
    letters: projectInitials(row.member_name ?? "?"),
    gradient: "linear-gradient(135deg, #64748b, #475569)",
  };
}

export function SlackStyleFeed({ rows }: { rows: FeedRow[] }) {
  // Per-card independent expand state, keyed by stable rowKey
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Group rows by date bucket
  const groups = new Map<string, FeedRow[]>();
  for (const r of rows) {
    if (!groups.has(r.date)) groups.set(r.date, []);
    groups.get(r.date)!.push(r);
  }
  const sortedDates = Array.from(groups.keys()).sort((a, b) => (a > b ? -1 : 1));

  return (
    <div
      className="rounded-2xl bg-white overflow-hidden"
      style={{
        border: "1px solid var(--border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.04)",
      }}
    >
      <div>
        {sortedDates.map((date) => {
          const items = groups.get(date)!.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          return (
            <div key={date}>
              <div className="slack-feed-divider">
                <span>{fmtDateBucket(date)}</span>
              </div>
              <div>
                {items.map((row) => (
                  <FeedMessage
                    key={row.rowKey}
                    row={row}
                    expanded={expanded.has(row.rowKey)}
                    onToggle={() => toggle(row.rowKey)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeedMessage({
  row,
  expanded,
  onToggle,
}: {
  row: FeedRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const av = avatarFor(row);
  const isLong = row.summary_text.length > 280;

  const displayName =
    row.type === "project" ? "Project Summary" : row.member_name || "Member";

  return (
    <div className="slack-msg group flex gap-3 px-5 sm:px-6 py-3 border-b border-slate-100 last:border-b-0">
      {/* Avatar */}
      <div
        className="h-9 w-9 rounded-md flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5"
        style={{ background: av.gradient, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
      >
        {av.letters}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        {/* Header row: name · time · badges */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
          <span className="font-bold text-[14.5px] text-slate-900 leading-none">
            {displayName}
          </span>
          {row.member_role === "team_lead" && (
            <span
              className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: "#eef2ff", color: "#4338ca" }}
            >
              LEAD
            </span>
          )}
          {row.type === "project" && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: "#eef2ff", color: "#4338ca" }}
            >
              <BarChart3 className="h-2.5 w-2.5" /> TEAM
            </span>
          )}
          <span className="text-[12px] text-slate-400 leading-none">
            {format(new Date(row.created_at), "h:mm a")}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            style={
              row.is_auto_generated
                ? { background: "#ecfdf5", color: "#059669" }
                : { background: "#faf5ff", color: "#7c3aed" }
            }
          >
            {row.is_auto_generated ? (
              <>
                <Sparkles className="h-2.5 w-2.5" /> Auto
              </>
            ) : (
              <>
                <PenLine className="h-2.5 w-2.5" /> Manual
              </>
            )}
          </span>
          <span className="text-[11px] text-slate-400">
            · {row.message_count} {row.message_count === 1 ? "msg" : "msgs"}
          </span>
        </div>

        {/* Markdown summary */}
        <div className={`mt-1.5 ${expanded ? "" : "line-clamp-3"} ${MD}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {row.summary_text}
          </ReactMarkdown>
        </div>

        {isLong && (
          <button
            type="button"
            onClick={onToggle}
            className="mt-1 text-[12.5px] font-semibold text-indigo-600 hover:underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}
