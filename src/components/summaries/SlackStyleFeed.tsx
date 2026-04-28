import { useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Sparkles, PenLine } from "lucide-react";
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

const TRUNCATE_CHARS = 400;

function fmtDateBucket(d: string): string {
  try {
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
  const isLong = row.summary_text.length > TRUNCATE_CHARS;
  const displayName = row.type === "project" ? "Project Summary" : (row.member_name || "Member");

  return (
    <div className="slack-msg group flex gap-3 px-5 sm:px-6 py-3 border-b border-border last:border-b-0">
      <div
        className="h-9 w-9 rounded-md flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5 select-none"
        style={{ background: av.gradient, boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }}
      >
        {av.letters}
      </div>

      <div className="min-w-0 flex-1">
        {/* Header row */}
        <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5 mb-0.5">
          <span className="font-bold text-[15px] text-foreground leading-snug">
            {displayName}
          </span>

          {/* LEAD badge */}
          {row.member_role === "team_lead" && (
            <span
              className="inline-flex items-center text-[10px] font-semibold px-1.5 py-[2px] rounded"
              style={{ background: "var(--badge-team-bg)", color: "var(--badge-team-color)" }}
            >
              lead
            </span>
          )}

          {/* PROJECT SUMMARY label for team-type rows */}
          {row.type === "project" && (
            <span
              className="inline-flex items-center text-[10px] font-semibold px-1.5 py-[2px] rounded"
              style={{ background: "rgba(18,100,163,0.08)", color: "#1264a3" }}
            >
              project
            </span>
          )}

          {/* Auto / Manual badge */}
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

          {/* Timestamp */}
          <span className="text-[11px] text-muted-foreground/70 leading-none">
            {format(new Date(row.created_at), "h:mm a")}
          </span>
          <span className="text-[11px] text-muted-foreground/40">
            · {row.message_count} {row.message_count === 1 ? "msg" : "msgs"}
          </span>
        </div>

        {/* Markdown body — always visible, optionally truncated */}
        <div className={MD}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {isLong && !expanded
              ? row.summary_text.slice(0, TRUNCATE_CHARS) + "…"
              : row.summary_text}
          </ReactMarkdown>
        </div>

        {/* Show more / Show less */}
        {isLong && (
          <button
            type="button"
            onClick={onToggle}
            className="mt-1.5 text-[12.5px] font-semibold text-primary hover:underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}
