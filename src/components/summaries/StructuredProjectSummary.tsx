import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TrendingUp, CheckCircle2, AlertTriangle, ListChecks } from "lucide-react";

const SECTION_DEFS = [
  {
    key: "overall_progress",
    title: "Overall Progress",
    icon: TrendingUp,
    border: "border-l-sky-500",
    iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    aliases: ["overall progress", "progress", "summary", "overview"],
  },
  {
    key: "key_decisions",
    title: "Key Decisions",
    icon: CheckCircle2,
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    aliases: ["key decisions", "decisions"],
  },
  {
    key: "blockers",
    title: "Blockers & Risks",
    icon: AlertTriangle,
    border: "border-l-amber-500",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    aliases: ["blockers & risks", "blockers and risks", "blockers", "risks"],
  },
  {
    key: "action_items",
    title: "Action Items",
    icon: ListChecks,
    border: "border-l-violet-500",
    iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    aliases: ["action items", "actions", "next steps", "todo", "to do"],
  },
] as const;

interface ParsedSection {
  key: string;
  title: string;
  body: string;
}

/**
 * Parses a markdown summary, extracting top-level headings (## or **) that
 * correspond to one of the known sections. Any text not in a known section
 * goes into "other".
 */
function parseSummary(text: string): { sections: ParsedSection[]; other: string } {
  const lines = text.split(/\r?\n/);
  const buckets: Record<string, string[]> = {};
  const otherLines: string[] = [];
  let current: string | null = null;

  const headingRe = /^\s*(?:#{1,6}\s+|\*\*\s*)([^*#:]+?)(?:\s*\*\*)?\s*:?\s*$/;

  for (const line of lines) {
    const m = line.match(headingRe);
    if (m) {
      const label = m[1].trim().toLowerCase();
      const def = SECTION_DEFS.find((s) =>
        s.aliases.some((a) => label === a || label.startsWith(a)),
      );
      if (def) {
        current = def.key;
        if (!buckets[current]) buckets[current] = [];
        continue;
      }
    }
    if (current) {
      buckets[current].push(line);
    } else {
      otherLines.push(line);
    }
  }

  const sections: ParsedSection[] = SECTION_DEFS
    .filter((d) => buckets[d.key] && buckets[d.key].join("").trim().length > 0)
    .map((d) => ({
      key: d.key,
      title: d.title,
      body: buckets[d.key].join("\n").trim(),
    }));

  return { sections, other: otherLines.join("\n").trim() };
}

const MD_CLASSES =
  "text-sm text-foreground leading-relaxed [&_p]:mt-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline";

export function StructuredProjectSummary({
  text,
  collapsible = true,
}: {
  text: string;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(!collapsible);
  const { sections, other } = parseSummary(text || "");

  // Fallback: no recognized sections — render plain markdown.
  if (sections.length === 0) {
    const isLong = text.length > 280;
    const display = expanded || !isLong ? text : text.slice(0, 280) + "…";
    return (
      <div className="space-y-2">
        <div className={MD_CLASSES}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{display}</ReactMarkdown>
        </div>
        {collapsible && isLong && (
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

  const visibleSections = collapsible && !expanded ? sections.slice(0, 2) : sections;
  const hasMore = collapsible && sections.length > 2;

  return (
    <div className="space-y-2.5">
      {other && (
        <div className={MD_CLASSES}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{other}</ReactMarkdown>
        </div>
      )}
      {visibleSections.map((s) => {
        const def = SECTION_DEFS.find((d) => d.key === s.key)!;
        const Icon = def.icon;
        return (
          <div
            key={s.key}
            className={`rounded-lg border border-border border-l-4 ${def.border} bg-background/60 p-3`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${def.iconBg}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {s.title}
              </h4>
            </div>
            <div className={MD_CLASSES}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.body}</ReactMarkdown>
            </div>
          </div>
        );
      })}
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : `Show ${sections.length - 2} more section${sections.length - 2 === 1 ? "" : "s"}`}
        </button>
      )}
    </div>
  );
}
