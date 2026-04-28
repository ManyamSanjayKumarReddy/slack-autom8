interface Props {
  placeholder?: string;
}

export function SlackMessageComposer({ placeholder }: Props) {
  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/40 overflow-hidden opacity-60 pointer-events-none select-none">
      <div className="px-4 py-4 min-h-[64px] flex items-center">
        <span className="text-[14px] text-muted-foreground/60 italic">
          {placeholder ?? "What has your team done this week?"}
        </span>
      </div>
    </div>
  );
}
