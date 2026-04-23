import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: () => void;
}

export function GenerateSummaryDialog({ open, onOpenChange, onGenerated }: Props) {
  const today = new Date();
  const [fromDate, setFromDate] = useState<Date | undefined>(today);
  const [toDate, setToDate] = useState<Date | undefined>(today);
  const [context, setContext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFromDate(new Date());
      setToDate(new Date());
      setContext("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from_date", format(fromDate, "yyyy-MM-dd"));
      if (toDate) params.set("to_date", format(toDate, "yyyy-MM-dd"));
      if (context.trim()) params.set("context", context.trim());

      const qs = params.toString();
      const res = await apiFetch(`/summaries/generate${qs ? `?${qs}` : ""}`, {
        method: "POST",
      });

      if (!res.ok) {
        let msg = "Failed to generate summary";
        try {
          const data = await res.json();
          if (data?.detail) msg = typeof data.detail === "string" ? data.detail : msg;
          else if (data?.message) msg = data.message;
        } catch {
          // ignore
        }
        setError(msg);
        return;
      }
      onGenerated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Summary</DialogTitle>
          <DialogDescription>
            Pick a date range and optional context. Defaults to today.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="from-date">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="from-date"
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="to-date">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="to-date"
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !toDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="context">Context (optional)</Label>
            <Input
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. focus on action items, decisions made"
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)]"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Generating…" : "Generate Summary"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
