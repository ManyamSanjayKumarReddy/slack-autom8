import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MD =
  "text-[13.5px] text-foreground leading-relaxed " +
  "[&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1 " +
  "[&_h2]:text-[13.5px] [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 " +
  "[&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-0.5 " +
  "[&_p]:mt-1.5 [&_p]:leading-relaxed " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:mt-1.5 " +
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:mt-1.5 " +
  "[&_strong]:font-semibold " +
  "[&_code]:bg-slate-100 [&_code]:text-slate-700 [&_code]:rounded [&_code]:px-1 [&_code]:text-xs " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-slate-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 " +
  "[&_a]:text-primary [&_a]:underline";

export function StructuredProjectSummary({
  text,
  collapsible = true,
}: {
  text: string;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(!collapsible);
  const content = text || "";
  const isLong = collapsible && content.length > 600;
  const display = expanded || !isLong ? content : content.slice(0, 600) + "…";

  return (
    <div className="space-y-2">
      <div className={MD}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{display}</ReactMarkdown>
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
