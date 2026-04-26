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
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, #f0f4ff 0%, #f6f8fc 50%, #eef2ff 100%)" }}
    >
      {/* Background decorative orbs */}
      <div
        className="absolute top-[-120px] left-[-80px] h-[500px] w-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)" }}
      />
      <div
        className="absolute bottom-[-80px] right-[-60px] h-[400px] w-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 65%)" }}
      />
      <div
        className="absolute top-[40%] right-[15%] h-[200px] w-[200px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-[960px] flex flex-col lg:flex-row gap-8 items-center">

        {/* Left — branding panel */}
        <div className="flex-1 flex flex-col gap-8 px-2 lg:px-0 text-center lg:text-left">
          {/* Logo */}
          <div className="flex items-center gap-3 justify-center lg:justify-start">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                boxShadow: "0 6px 20px rgba(99,102,241,0.4)",
              }}
            >
              <SlackIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[16px] font-bold leading-tight" style={{ color: "#0f172a" }}>
                Slack Autom8
              </div>
              <div className="text-[11px] font-medium" style={{ color: "#94a3b8" }}>
                AI Summarizer
              </div>
            </div>
          </div>

          {/* Headline */}
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold mb-5"
              style={{
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.2)",
                color: "#6366f1",
              }}
            >
              <Sparkles className="h-3 w-3" />
              Powered by AI
            </div>
            <h1
              className="font-extrabold leading-tight tracking-tight mb-4"
              style={{ fontSize: "clamp(28px, 4vw, 40px)", color: "#0f172a", letterSpacing: "-0.03em" }}
            >
              Turn Slack noise into{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                clear insights
              </span>
            </h1>
            <p style={{ fontSize: "15px", color: "#64748b", lineHeight: "1.6", maxWidth: "380px" }}
              className="mx-auto lg:mx-0">
              Automatically summarise your team's Slack conversations and
              deliver concise digests straight to your dashboard.
            </p>
          </div>

          {/* Feature pills */}
          <ul className="flex flex-col gap-3 max-w-sm mx-auto lg:mx-0">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.18)",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />
                </div>
                <span style={{ fontSize: "13.5px", color: "#475569", fontWeight: 500 }}>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — login card */}
        <div className="w-full lg:w-[400px] shrink-0">
          <div
            className="rounded-2xl p-8"
            style={{
              background: "#ffffff",
              border: "1px solid #e0e7ff",
              boxShadow: "0 8px 40px rgba(99,102,241,0.1), 0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {/* Card header */}
            <div className="mb-7">
              <h2
                className="font-bold mb-2"
                style={{ fontSize: "22px", color: "#0f172a", letterSpacing: "-0.02em" }}
              >
                Welcome back
              </h2>
              <p style={{ fontSize: "14px", color: "#64748b" }}>
                Sign in with your Slack account to continue.
              </p>
            </div>

            {/* CTA button */}
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 px-5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
              }}
            >
              <SlackIcon className="h-5 w-5" />
              Continue with Slack
            </button>

            {/* Divider */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>
                Secure OAuth 2.0
              </span>
              <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
            </div>

            {/* Trust note */}
            <p
              className="mt-5 text-center leading-relaxed"
              style={{ fontSize: "12px", color: "#94a3b8" }}
            >
              By continuing, you authorise Slack Autom8 to read messages from your
              workspace on your behalf.
            </p>
          </div>

          <p className="mt-5 text-center" style={{ fontSize: "12px", color: "#94a3b8" }}>
            © {new Date().getFullYear()} Slack Autom8. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}
