import { Bold, Italic, Link2, Smile, Paperclip, Send } from "lucide-react";

interface Props {
  placeholder?: string;
}

export function SlackMessageComposer({ placeholder }: Props) {
  return (
    <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 pt-3 pb-1 min-h-[64px]">
        <textarea
          placeholder={placeholder ?? "Add a note…"}
          rows={2}
          className="w-full bg-transparent text-[14px] leading-[1.5] text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none"
        />
      </div>
      <div className="flex items-center justify-between px-2 pb-2 pt-0.5 gap-2">
        <div className="flex items-center gap-0.5">
          <Btn icon={Bold} label="Bold" />
          <Btn icon={Italic} label="Italic" />
          <Btn icon={Link2} label="Link" />
          <div className="w-px h-4 bg-border mx-1" />
          <Btn icon={Smile} label="Emoji" />
          <Btn icon={Paperclip} label="Attach" />
        </div>
        <button
          type="button"
          className="h-7 w-7 rounded-lg flex items-center justify-center text-primary-foreground transition-opacity hover:opacity-80"
          style={{ background: "#1264a3" }}
          title="Send"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Btn({ icon: Icon, label }: { icon: typeof Bold; label: string }) {
  return (
    <button
      type="button"
      title={label}
      className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
