import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Summary } from "./SummariesTab";

interface Props {
  summary: Summary | null;
  onOpenChange: (open: boolean) => void;
  channelMap?: Record<string, string>;
}

function fmt(d: string) {
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return d;
  }
}

function fmtFull(d: string) {
  try {
    return format(new Date(d), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return d;
  }
}

export function ViewSummaryDialog({ summary, onOpenChange, channelMap }: Props) {
  const open = summary !== null;
  const text = summary?.summary_text || summary?.summary || "";
  const channelIds = summary?.channel_ids ?? [];
  const channelCount = channelIds.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {summary && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">
                {fmt(summary.from_date)} – {fmt(summary.to_date)}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge variant="secondary" className="inline-flex items-center gap-1.5">
                  {channelCount} channel{channelCount === 1 ? "" : "s"}
                  {channelCount > 0 && (
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Show channels"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <ul className="space-y-0.5">
                            {channelIds.map((id) => (
                              <li key={id}>#{channelMap?.[id] ?? id}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </Badge>
                <Badge variant="secondary">{summary.message_count} messages</Badge>
              </div>
            </DialogHeader>

            <div className="rounded-xl border border-border bg-secondary/40 p-5 text-sm leading-relaxed text-foreground">
              {text ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-primary">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                </div>
              ) : (
                <span className="text-muted-foreground">No summary text available.</span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Created {fmtFull(summary.created_at)}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
