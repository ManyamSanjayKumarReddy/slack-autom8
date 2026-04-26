import { createFileRoute, redirect } from "@tanstack/react-router";
import { SlackIcon } from "@/components/SlackIcon";
import { API_URL, isAuthenticated, setToken } from "@/lib/auth";
import { useEffect } from "react";
import {
  Sparkles,
  Shield,
  Users,
  Zap,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Hash,
  MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && isAuthenticated()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LandingPage,
});

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI summaries on autopilot",
    text: "Daily digests of every channel — written by AI, ready when you arrive.",
  },
  {
    icon: BarChart3,
    title: "Project & personal views",
    text: "Drill from project rollups down to each team member's day.",
  },
  {
    icon: Shield,
    title: "Role-based access",
    text: "Admin, Manager, Team Lead, Employee — everyone sees the right thing.",
  },
  {
    icon: Zap,
    title: "Built for scale",
    text: "Add channels, members, and projects in seconds. No setup pain.",
  },
];

const STEPS = [
  { n: "01", title: "Connect Slack", text: "Sign in with one click — OAuth 2.0, no passwords." },
  { n: "02", title: "Pick channels", text: "Choose which channels each project should listen to." },
  { n: "03", title: "Read the digest", text: "Get crisp, structured summaries every single day." },
];

function LandingPage() {
  useEffect(() => {
    document.title = "Slack Autom8 — AI Summaries for Slack";
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
    <main
      className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #fafbff 0%, #f5f7ff 100%)" }}
    >
      {/* Decorative background orbs */}
      <div
        className="absolute top-[-200px] left-[-150px] h-[600px] w-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)" }}
      />
      <div
        className="absolute top-[100px] right-[-200px] h-[500px] w-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 65%)" }}
      />
      <div
        className="absolute bottom-[-100px] left-[30%] h-[400px] w-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)" }}
      />

      {/* ── Top nav ── */}
      <nav className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
            }}
          >
            <SlackIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold leading-tight" style={{ color: "#0f172a", letterSpacing: "-0.02em" }}>
              Slack Autom8
            </div>
            <div className="text-[11px] font-medium" style={{ color: "#94a3b8" }}>
              AI Summarizer
            </div>
          </div>
        </div>
        <button
          onClick={handleLogin}
          className="hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: "#0f172a",
            color: "#fff",
            boxShadow: "0 4px 14px rgba(15,23,42,0.2)",
          }}
        >
          <SlackIcon className="h-4 w-4" />
          Sign in
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-20 sm:pb-28 text-center">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-6"
          style={{
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(99,102,241,0.2)",
          }}
        >
          <Sparkles className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />
          <span className="text-[12px] font-semibold" style={{ color: "#4338ca" }}>
            Powered by AI · Built for Slack
          </span>
        </div>

        <h1
          className="font-extrabold leading-[1.05] tracking-tight mb-6 max-w-4xl mx-auto"
          style={{
            fontSize: "clamp(36px, 6vw, 64px)",
            color: "#0f172a",
            letterSpacing: "-0.035em",
          }}
        >
          Turn endless Slack chatter into{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            clear daily digests
          </span>
        </h1>

        <p
          className="max-w-2xl mx-auto mb-9 leading-relaxed"
          style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#475569" }}
        >
          Slack Autom8 reads your team's conversations and writes structured
          summaries — overall progress, decisions, blockers, action items.
          You stay in the loop without scrolling for hours.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-3 flex-wrap mb-10">
          <button
            onClick={handleLogin}
            className="inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 text-[14px] font-semibold text-white transition-all hover:opacity-95 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
            }}
          >
            <SlackIcon className="h-5 w-5" />
            Continue with Slack
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3.5 text-[14px] font-semibold transition-all no-underline"
            style={{
              background: "#fff",
              color: "#334155",
              border: "1px solid #e2e8f0",
            }}
          >
            See how it works
          </a>
        </div>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-5 flex-wrap text-[12px]"
          style={{ color: "#64748b" }}>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#10b981" }} />
            OAuth 2.0 secure sign-in
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#10b981" }} />
            Read-only access
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#10b981" }} />
            Role-based permissions
          </span>
        </div>

        {/* Hero mock card */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#fff",
              border: "1px solid #e0e7ff",
              boxShadow: "0 30px 80px -20px rgba(99,102,241,0.3), 0 10px 30px rgba(0,0,0,0.08)",
            }}
          >
            {/* Mock browser bar */}
            <div className="flex items-center gap-1.5 px-4 py-2.5"
              style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#fca5a5" }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#fcd34d" }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#86efac" }} />
              <div className="ml-3 px-2.5 py-0.5 rounded text-[10px] font-medium"
                style={{ background: "#fff", color: "#94a3b8", border: "1px solid #e2e8f0" }}>
                slack-autom8.app/dashboard
              </div>
            </div>
            {/* Mock summary content */}
            <div className="p-6 sm:p-8 text-left">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-extrabold"
                  style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>
                  IB
                </div>
                <div>
                  <div className="text-[14px] font-bold" style={{ color: "#0f172a" }}>
                    IBM Bill of Materials
                  </div>
                  <div className="text-[11px]" style={{ color: "#94a3b8" }}>
                    Today's project digest · 2 channels · 47 messages
                  </div>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>
                  <Sparkles className="h-2.5 w-2.5" /> Auto-generated
                </span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Overall Progress", color: "#6366f1", text: "Nitish joined the team and started on Langchain agents. Sanjay closed 3 GitLab bugs." },
                  { label: "Key Decisions", color: "#10b981", text: "Adopted Langgraph middleware for orchestration. Daily standup moved to 10am." },
                  { label: "Blockers & Risks", color: "#f59e0b", text: "Waiting on access tokens for the staging environment." },
                  { label: "Action Items", color: "#ec4899", text: "Sanjay to ship bug fixes by EOD. Nitish to draft Langgraph spec." },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg p-3"
                    style={{ background: "#fafbff", borderLeft: `3px solid ${s.color}` }}>
                    <div className="text-[11.5px] font-bold mb-1" style={{ color: s.color, letterSpacing: "0.02em" }}>
                      {s.label.toUpperCase()}
                    </div>
                    <div className="text-[12.5px] leading-relaxed" style={{ color: "#475569" }}>
                      {s.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <div className="text-center mb-14">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3"
            style={{ color: "#6366f1" }}>
            Why teams pick Slack Autom8
          </div>
          <h2 className="font-extrabold tracking-tight mb-4"
            style={{ fontSize: "clamp(28px, 4vw, 40px)", color: "#0f172a", letterSpacing: "-0.03em" }}>
            Everything you need, nothing you don't
          </h2>
          <p className="max-w-xl mx-auto" style={{ fontSize: "15px", color: "#64748b" }}>
            Built specifically for engineering and product teams who live inside Slack.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl p-6 transition-all hover:-translate-y-0.5"
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))",
                  border: "1px solid rgba(99,102,241,0.15)",
                }}
              >
                <Icon className="h-5 w-5" style={{ color: "#6366f1" }} />
              </div>
              <h3 className="font-bold mb-2" style={{ fontSize: "15px", color: "#0f172a", letterSpacing: "-0.01em" }}>
                {title}
              </h3>
              <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <div className="text-center mb-14">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: "#6366f1" }}>
            How it works
          </div>
          <h2 className="font-extrabold tracking-tight mb-4"
            style={{ fontSize: "clamp(28px, 4vw, 40px)", color: "#0f172a", letterSpacing: "-0.03em" }}>
            Up and running in minutes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative">
              <div
                className="rounded-2xl p-6 h-full"
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div className="text-[36px] font-extrabold mb-2 leading-none"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: "-0.04em",
                  }}>
                  {s.n}
                </div>
                <h3 className="font-bold mb-2" style={{ fontSize: "16px", color: "#0f172a" }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: "1.6" }}>
                  {s.text}
                </p>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight
                  className="hidden md:block absolute top-1/2 -right-4 h-5 w-5 z-10"
                  style={{ color: "#cbd5e1", transform: "translateY(-50%)" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Stats strip */}
        <div className="mt-16 grid grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { icon: Hash, label: "Channels supported", value: "Unlimited" },
            { icon: MessageSquare, label: "Daily digests", value: "Automatic" },
            { icon: Users, label: "Roles built-in", value: "4 levels" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <Icon className="h-5 w-5 mx-auto mb-2" style={{ color: "#6366f1" }} />
              <div className="font-extrabold" style={{ fontSize: "18px", color: "#0f172a" }}>
                {value}
              </div>
              <div className="text-[11.5px] mt-0.5" style={{ color: "#64748b" }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pb-20">
        <div
          className="rounded-3xl px-6 sm:px-12 py-14 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #8b5cf6 100%)",
            boxShadow: "0 30px 80px -20px rgba(99,102,241,0.5)",
          }}
        >
          <div className="absolute top-[-80px] right-[-80px] h-[300px] w-[300px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)" }} />
          <div className="absolute bottom-[-60px] left-[-60px] h-[240px] w-[240px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)" }} />

          <div className="relative">
            <h2 className="font-extrabold tracking-tight mb-3"
              style={{ fontSize: "clamp(26px, 4vw, 38px)", color: "#fff", letterSpacing: "-0.03em" }}>
              Ready to read less, know more?
            </h2>
            <p className="mb-7 max-w-xl mx-auto"
              style={{ fontSize: "15px", color: "rgba(255,255,255,0.85)", lineHeight: "1.6" }}>
              Sign in with Slack and your first project digest is one click away.
            </p>
            <button
              onClick={handleLogin}
              className="inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 text-[14px] font-semibold transition-all hover:opacity-95 active:scale-[0.98]"
              style={{
                background: "#fff",
                color: "#4338ca",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              }}
            >
              <SlackIcon className="h-5 w-5" />
              Continue with Slack
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-8 flex items-center justify-between flex-wrap gap-3"
        style={{ borderTop: "1px solid #e2e8f0" }}>
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
            <SlackIcon className="h-3.5 w-3.5" />
          </div>
          <span className="text-[12px] font-semibold" style={{ color: "#475569" }}>
            Slack Autom8
          </span>
        </div>
        <p className="text-[12px]" style={{ color: "#94a3b8" }}>
          © {new Date().getFullYear()} Slack Autom8. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
