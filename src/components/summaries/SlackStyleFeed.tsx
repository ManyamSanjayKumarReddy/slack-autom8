import { useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Sparkles, PenLine, BarChart3, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { nameToGradient, nameInitials } from "@/lib/avatar-colors";

export interface FeedRow {
  id: string;
  rowKey: string;
  date: string;        // yyyy-MM-dd bucket
  created_at: string;  // ISO
  summary_text: string;
  message_count: number;
  is_auto_generated?: boolean;
  type: "project" | "personal";
  member_name?: string;
  member_role?: "employee" | "team_lead";
}

// Headers match body size, just bold — no size inflation
const MD =
  "text-[14px] leading-[1.5] text-foreground " +
  "[&_h1]:text-[14px] [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1 " +
  "[&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:mt-2.5 [&_h2]:mb-0.5 " +
  "[&_h3]:text-[14px] [&_h3]:font-semibold [&_h3]:mt-2 " +
  "[&_p]:mt-1.5 [&_p]:leading-[1.5] " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5 [&_ul]:mt-1 " +
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-0.5 [&_ol]:mt-1 " +
  "[&_strong]:font-semibold " +
  "[&_a]:text-primary [&_a]:underline " +
  "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:text-[12.5px]";

function fmtDateBucket(d: string): string {
  try {
    // Use noon to avoid timezone edge-cases
    const dt = new Date(d + "T12:00:00");
    if (isToday(dt)) return "Today";
    if (isYesterday(dt)) return "Yesterday";
    return format(dt, "EEEE, MMMM d");
  } catch {
    return d;
  }
}

function avatarFor(row: FeedRow): { letters: string; gradient: string } {
  if (row.type === "project") {
    return { letters: "PS", gradient: "linear-gradient(135deg, #1264a3, #0f5289)" };
  }
  const name = row.member_name || "?";
  return { letters: nameInitials(name), gradient: nameToGradient(name) };
}

export function SlackStyleFeed({ rows }: { rows: FeedRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const groups = new Map<string, FeedRow[]>();
  for (const r of rows) {
    if (!groups.has(r.date)) groups.set(r.date, []);
    groups.get(r.date)!.push(r);
  }
  const sortedDates = Array.from(groups.keys()).sort((a, b) => (a > b ? -1 : 1));

  return (
    <div className="rounded-2xl bg-card overflow-hidden border border-border">
      {sortedDates.map((date) => {
        const items = groups
          .get(date)!
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
  const displayName = row.type === "project" ? "Project Summary" : (row.member_name || "Member");

  return (
    <div className="slack-msg group flex gap-3 px-5 sm:px-6 py-3 border-b border-border last:border-b-0">
      {/* Avatar — colored initials, not generic "P" */}
      <div
        className="h-9 w-9 rounded-md flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5 select-none"
        style={{ background: av.gradient, boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }}
      >
        {av.letters}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        {/* Header row: name · badges · timestamp · msg count */}
        <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5 mb-0.5">
          <span className="font-bold text-[15px] text-foreground leading-snug">
            {displayName}
          </span>

          {/* LEAD badge — subtle, lowercase */}
          {row.member_role === "team_lead" && (
            <span
              className="inline-flex items-center text-[10px] font-semibold px-1.5 py-[2px] rounded"
              style={{ background: "var(--badge-team-bg)", color: "var(--badge-team-color)" }}
            >
              lead
            </span>
          )}

          {/* TEAM badge — workspace-style indicator */}
          {row.type === "project" && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-[2px] rounded"
              style={{ background: "var(--badge-team-bg)", color: "var(--badge-team-color)" }}
            >
              <BarChart3 className="h-2.5 w-2.5" />
              team
            </span>
          )}

          {/* Auto (green) / Manual (amber) badge */}
          <span
            className="inline-flex items-center gap-[3px] rounded-full px-1.5 py-[2px] text-[10px] font-semibold"
            style={
              row.is_auto_generated
                ? { background: "var(--badge-auto-bg)", color: "var(--badge-auto-color)" }
                : { background: "var(--badge-manual-bg)", color: "var(--badge-manual-color)" }
            }
          >
            {row.is_auto_generated ? (
              <><Sparkles className="h-2.5 w-2.5" />Auto</>
            ) : (
              <><PenLine className="h-2.5 w-2.5" />Manual</>
            )}
          </span>

          {/* Timestamp — 11px, muted */}
          <span className="text-[11px] text-muted-foreground/70 leading-none">
            {format(new Date(row.created_at), "h:mm a")}
          </span>
          <span className="text-[11px] text-muted-foreground/40">
            · {row.message_count} {row.message_count === 1 ? "msg" : "msgs"}
          </span>
        </div>

        {/* Markdown body — line-height 1.5, no size inflation on headers */}
        <div className={`${expanded ? "" : "line-clamp-3"} ${MD}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.summary_text}</ReactMarkdown>
        </div>

        {/* Thread-style expand — replaces plain "Show more" */}
        {isLong && (
          <button
            type="button"
            onClick={onToggle}
            className="group/thread mt-2 flex items-center gap-1.5"
          >
            {/* Mini avatar stack */}
            <div
              className="h-[18px] w-[18px] rounded-[3px] text-[7px] font-bold text-white flex items-center justify-center shrink-0 ring-1 ring-card"
              style={{ background: av.gradient }}
            >
              {av.letters[0]}
            </div>
            <span className="text-[12.5px] font-semibold text-primary group-hover/thread:underline">
              {expanded ? "Collapse thread" : "View thread"}
            </span>
            {!expanded && (
              <span className="text-[11px] text-muted-foreground/60">
                Last reply {format(new Date(row.created_at), "h:mm a")}
              </span>
            )}
            <ChevronRight
              className={`h-3 w-3 text-muted-foreground/60 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </button>
        )}
      </div>
    </div>
  );
}
