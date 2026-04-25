import { createFileRoute, redirect } from "@tanstack/react-router";
import { SlackIcon } from "@/components/SlackIcon";
import { API_URL, isAuthenticated, setToken } from "@/lib/auth";
import { useEffect } from "react";
import { Sparkles, Shield, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && isAuthenticated()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});

const FEATURES = [
  { icon: Sparkles, text: "AI-powered conversation summaries" },
  { icon: Users, text: "Team & project-level insights" },
  { icon: Shield, text: "Role-based access control" },
  { icon: Zap, text: "Auto-generated daily digests" },
];

function LoginPage() {
  useEffect(() => {
    document.title = "Slack Autom8 — Sign in";
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setToken(token);
      window.location.href = "/dashboard";
    }
  }, []);

  const handleLogin = () => {
    window.location.href = `${API_URL}/auth/slack`;
  };

  return (
    <main className="min-h-screen flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] shrink-0 p-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 35%, #1d4ed8 75%, #1e40af 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-[-100px] right-[-60px] h-[420px] w-[420px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(165,180,252,0.2) 0%, rgba(99,102,241,0.08) 50%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[-60px] left-[-40px] h-[320px] w-[320px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(96,165,250,0.18) 0%, rgba(59,130,246,0.06) 50%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              boxShadow: "0 6px 20px rgba(99,102,241,0.4)",
            }}
          >
            <SlackIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[15px] font-bold text-white leading-tight">Slack Autom8</div>
            <div className="text-[11px] text-[#64748b]">AI Summarizer</div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold mb-6"
            style={{
              background: "rgba(165,180,252,0.18)",
              border: "1px solid rgba(165,180,252,0.35)",
              color: "#c7d2fe",
            }}
          >
            <Sparkles className="h-3 w-3" />
            Powered by AI
          </div>

          <h1
            className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight text-white mb-5"
          >
            Turn Slack noise
            <br />
            into{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #93c5fd 0%, #c7d2fe 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              clear insights
            </span>
          </h1>

          <p className="text-[#bfdbfe] text-base leading-relaxed mb-10 max-w-sm">
            Automatically summarise your team's Slack conversations and
            deliver concise digests straight to your dashboard.
          </p>

          <ul className="space-y-3.5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(165,180,252,0.15)",
                    border: "1px solid rgba(165,180,252,0.3)",
                  }}
                >
                  <Icon className="h-3.5 w-3.5 text-blue-300" />
                </div>
                <span className="text-sm text-[#dbeafe]">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative text-xs text-[#93c5fd] opacity-60">
          © {new Date().getFullYear()} Slack Autom8. All rights reserved.
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              boxShadow: "0 6px 20px rgba(99,102,241,0.4)",
            }}
          >
            <SlackIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[15px] font-bold text-foreground leading-tight">Slack Autom8</div>
            <div className="text-[11px] text-muted-foreground">AI Summarizer</div>
          </div>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in with your Slack account to continue.
            </p>
          </div>

          <div
            className="rounded-2xl p-8"
            style={{
              background: "oklch(1 0 0)",
              border: "1px solid oklch(0.912 0.01 280)",
              boxShadow: "0 4px 24px oklch(0 0 0 / 0.07), 0 1px 3px oklch(0 0 0 / 0.05)",
            }}
          >
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 px-5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                boxShadow: "0 4px 14px rgba(99,102,241,0.45)",
              }}
            >
              <SlackIcon className="h-5 w-5" />
              Continue with Slack
            </button>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">secure OAuth 2.0</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <p className="mt-5 text-xs text-muted-foreground text-center leading-relaxed">
              By continuing, you authorise Slack Autom8 to read messages from your
              workspace on your behalf.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Slack Autom8
          </p>
        </div>
      </div>
    </main>
  );
}
