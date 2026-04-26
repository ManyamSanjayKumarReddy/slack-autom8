import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, Loader2 } from "lucide-react";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  scope: "personal" | "project";
  onStarted: () => void;
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
  const lastOpen = useRef(false);

  useEffect(() => {
    if (open && !lastOpen.current) {
      setDateRange({ from: new Date(), to: new Date() });
      setContext("");
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
        await handleApiError(
          res,
          scope === "personal" ? "Failed to start summary" : "Failed to start project summary",
        );
        setSubmitting(false);
        return;
      }
      toast("Summary is being generated…", { description: "Refresh in a few seconds." });
      onStarted();
      onOpenChange(false);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const title = scope === "personal" ? "Generate My Summary" : "Generate Project Summary";

  /* Quick-select helpers */
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
          {/* Date range picker */}
          <div className="flex flex-col gap-2">
            <Label>Date range</Label>

            {/* Quick picks */}
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
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors hover:bg-accent hover:text-accent-foreground"
                  style={{ borderColor: "#e2e8f0", color: "#475569", background: "#f8fafc" }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Calendar popover */}
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
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !dateRange?.from}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Starting…" : "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
