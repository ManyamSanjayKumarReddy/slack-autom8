import { createFileRoute, redirect } from "@tanstack/react-router";
import { SlackIcon } from "@/components/SlackIcon";
import { API_URL, isAuthenticated, setToken } from "@/lib/auth";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Slack Summarizer — Sign in" },
      {
        name: "description",
        content: "Sign in with Slack to get AI-powered summaries of your channels.",
      },
    ],
  }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && isAuthenticated()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  // Capture token from OAuth redirect: /?access_token=xxx&token_type=bearer
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");
    if (token) {
      setToken(token);
      window.location.href = "/dashboard";
    }
  }, []);

  const handleLogin = () => {
    window.location.href = `${API_URL}/auth/slack`;
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-[var(--shadow-elevated)] border border-border p-10 text-center">
          <div className="mx-auto mb-6 h-14 w-14 rounded-2xl bg-accent flex items-center justify-center">
            <SlackIcon className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Slack Summarizer
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Concise, AI-powered summaries of your Slack conversations — delivered straight to your
            dashboard.
          </p>

          <button
            onClick={handleLogin}
            className="mt-8 w-full inline-flex items-center justify-center gap-3 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-button)] transition-colors hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            <SlackIcon className="h-5 w-5" />
            Login with Slack
          </button>

          <p className="mt-6 text-xs text-muted-foreground">
            By continuing you agree to authorize Slack Summarizer to read your messages.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Slack Summarizer
        </p>
      </div>
    </main>
  );
}
