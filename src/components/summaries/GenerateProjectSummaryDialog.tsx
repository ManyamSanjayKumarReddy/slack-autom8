import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { AlertCircle, CalendarIcon, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface UsageInfo {
  used_this_week: number;
  weekly_limit: number;
  remaining: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  scope: "personal" | "project";
  /** Called with the task_id returned by the generate endpoint */
  onStarted: (taskId: string) => void;
}

function formatRange(range: DateRange | undefined): string {
  if (!range?.from) return "Pick a date range";
  if (!range.to || range.from.toDateString() === range.to.toDateString()) {
    return format(range.from, "MMM d, yyyy");
  }
  if (range.from.getFullYear() === range.to.getFullYear()) {
    return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`;
  }
  return `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`;
}

export function GenerateProjectSummaryDialog({
  open,
  onOpenChange,
  projectId,
  scope,
  onStarted,
}: Props) {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: today, to: today });
  const [context, setContext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const lastOpen = useRef(false);

  useEffect(() => {
    if (open && !lastOpen.current) {
      setDateRange({ from: new Date(), to: new Date() });
      setContext("");
      setRateLimitMsg(null);
      // Fetch current usage when dialog opens
      apiFetch("/summaries/usage")
        .then(async (res) => { if (res.ok) setUsage(await res.json()); })
        .catch(() => {});
    }
    lastOpen.current = open;
  }, [open]);

  const handleSubmit = async () => {
    if (!dateRange?.from) {
      toast.error("Pick a date range");
      return;
    }
    setSubmitting(true);
    try {
      const path =
        scope === "personal"
          ? `/summaries/projects/${projectId}/personal/generate`
          : `/summaries/projects/${projectId}/generate`;
      const body: Record<string, string> = {
        from_date: format(dateRange.from, "yyyy-MM-dd"),
        to_date: format(dateRange.to ?? dateRange.from, "yyyy-MM-dd"),
      };
      if (context.trim()) body.context = context.trim();

      const res = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) {
        if (res.status === 429) {
          let detail = "Weekly manual generation limit reached. Resets every Monday at 00:00 UTC.";
          try {
            const data = await res.json();
            if (typeof data?.detail === "string") detail = data.detail;
          } catch { /* ignore */ }
          setRateLimitMsg(detail);
          setSubmitting(false);
          return;
        }
        await handleApiError(
          res,
          scope === "personal" ? "Failed to start summary" : "Failed to start project summary",
        );
        setSubmitting(false);
        return;
      }
      const data = await res.json() as { task_id: string; usage?: UsageInfo };
      if (data.usage) setUsage(data.usage);
      toast("Summary is being generated…", { description: "You'll be notified when it's ready." });
      onStarted(data.task_id);
      onOpenChange(false);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const title = scope === "personal" ? "Generate My Summary" : "Generate Project Summary";

  const setToday = () => {
    const t = new Date();
    setDateRange({ from: t, to: t });
    setCalOpen(false);
  };
  const setYesterday = () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    setDateRange({ from: y, to: y });
    setCalOpen(false);
  };
  const setLast7 = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    setDateRange({ from: start, to: end });
    setCalOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Select a date range and optional context. Generation runs in the background.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Usage indicator */}
          {usage && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Weekly usage</span>
                  <span className="text-xs font-semibold text-foreground">
                    {usage.used_this_week} / {usage.weekly_limit}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (usage.used_this_week / usage.weekly_limit) * 100)}%`,
                      background: usage.remaining === 0 ? "#ef4444" : usage.remaining <= 2 ? "#f59e0b" : "#1264a3",
                    }}
                  />
                </div>
              </div>
              <span className={`text-xs font-medium shrink-0 ${usage.remaining === 0 ? "text-destructive" : usage.remaining <= 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                {usage.remaining} left
              </span>
            </div>
          )}

          {/* Date range picker */}
          <div className="flex flex-col gap-2">
            <Label>Date range</Label>

            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Today", fn: setToday },
                { label: "Yesterday", fn: setYesterday },
                { label: "Last 7 days", fn: setLast7 },
              ].map(({ label, fn }) => (
                <button
                  key={label}
                  type="button"
                  onClick={fn}
                  disabled={submitting}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-border text-muted-foreground bg-muted transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {label}
                </button>
              ))}
            </div>

            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={submitting}
                  className={cn(
                    "justify-start text-left font-normal w-full",
                    !dateRange?.from && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{formatRange(dateRange)}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range?.from && range?.to) setCalOpen(false);
                  }}
                  numberOfMonths={1}
                  disabled={{ after: today }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Context */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="gp-context">
              Context{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="gp-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. focus on action items and decisions"
              disabled={submitting}
              rows={3}
            />
          </div>

          {/* Rate limit error */}
          {rateLimitMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{rateLimitMsg}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !dateRange?.from || rateLimitMsg !== null}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Starting…" : "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
