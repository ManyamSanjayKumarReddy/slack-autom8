import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Summary } from "./SummariesTab";

interface Props {
  summary: Summary | null;
  onOpenChange: (open: boolean) => void;
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

export function ViewSummaryDialog({ summary, onOpenChange }: Props) {
  const open = summary !== null;
  const text = summary?.summary_text || summary?.summary || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {summary && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">
                {fmt(summary.from_date)} – {fmt(summary.to_date)}
              </DialogTitle>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="secondary">
                  {summary.channel_ids?.length ?? 0} channel
                  {(summary.channel_ids?.length ?? 0) === 1 ? "" : "s"}
                </Badge>
                <Badge variant="secondary">{summary.message_count} messages</Badge>
              </div>
            </DialogHeader>

            <div className="rounded-xl border border-border bg-secondary/40 p-5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {text || (
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
