import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
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
  /** "personal" or "project" — chooses endpoint */
  scope: "personal" | "project";
  /** Called once generation kicks off (for triggering polling on the parent). */
  onStarted: () => void;
}

export function GenerateProjectSummaryDialog({
  open,
  onOpenChange,
  projectId,
  scope,
  onStarted,
}: Props) {
  const today = new Date();
  const [fromDate, setFromDate] = useState<Date | undefined>(today);
  const [toDate, setToDate] = useState<Date | undefined>(today);
  const [context, setContext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lastOpen = useRef(false);

  useEffect(() => {
    if (open && !lastOpen.current) {
      setFromDate(new Date());
      setToDate(new Date());
      setContext("");
    }
    lastOpen.current = open;
  }, [open]);

  const handleSubmit = async () => {
    if (!fromDate || !toDate) {
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
        from_date: format(fromDate, "yyyy-MM-dd"),
        to_date: format(toDate, "yyyy-MM-dd"),
      };
      if (context.trim()) body.context = context.trim();

      const res = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        await handleApiError(
          res,
          scope === "personal"
            ? "Failed to start summary"
            : "Failed to start project summary",
        );
        setSubmitting(false);
        return;
      }
      toast("Summary is being generated…", {
        description: "Refresh in a few seconds.",
      });
      onStarted();
      onOpenChange(false);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    scope === "personal" ? "Generate My Summary" : "Generate Project Summary";

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Pick a date range and optional context. Generation runs in the
            background — refresh in a few seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gp-from">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="gp-from"
                    variant="outline"
                    disabled={submitting}
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
              <Label htmlFor="gp-to">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="gp-to"
                    variant="outline"
                    disabled={submitting}
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
            <Label htmlFor="gp-context">Context / instruction (optional)</Label>
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
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)]"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Starting…" : "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
