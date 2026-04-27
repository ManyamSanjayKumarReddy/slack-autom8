import { createFileRoute, redirect, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FolderKanban,
  Users as UsersIcon,
  Hash,
  ArrowRight,
  GitBranch,
  Search,
} from "lucide-react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { projectColor, projectInitials } from "@/lib/project-colors";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/lib/projects-store";
import type { PaginatedResponse } from "@/components/PaginationControls";

export const Route = createFileRoute("/hierarchy")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: HierarchyRoot,
});

function HierarchyRoot() {
  const location = useLocation();
  if (location.pathname !== "/hierarchy") {
    return <Outlet />;
  }
  return (
    <AppShell maxWidth="max-w-7xl">
      <ProjectPickerPage />
    </AppShell>
  );
}


function ProjectPickerPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Summary Report — Slack Autom8";
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/projects/?page=1&page_size=200`);
        if (!res.ok) {
          await handleApiError(res, "Failed to load projects");
          setProjects([]);
          return;
        }
        const data = (await res.json()) as PaginatedResponse<Project>;
        setProjects(data.results ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = (projects ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div
        className="rounded-2xl px-5 sm:px-8 py-5 sm:py-7 relative overflow-hidden border"
        style={{
          background: "linear-gradient(135deg, #eef2ff 0%, #f5f7ff 55%, #f6f8fc 100%)",
          borderColor: "#e0e7ff",
        }}
      >
        <div
          className="absolute right-[-40px] top-[-50px] h-[200px] w-[200px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)" }}
        />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 mb-3"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <GitBranch className="h-3 w-3" style={{ color: "#6366f1" }} />
              <span className="text-[11px] font-semibold" style={{ color: "#4338ca" }}>
                Summary Report
              </span>
            </div>
            <h1 className="font-extrabold mb-1.5"
              style={{ fontSize: "26px", color: "#0f172a", letterSpacing: "-0.025em" }}>
              Pick a project
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b" }}>
              Select a project to view its full summary report — project digests, members, and personal summaries.
            </p>
          </div>
          {projects && projects.length > 0 && (
            <div className="rounded-xl px-3.5 py-2 flex items-center gap-2"
              style={{ background: "#fff", border: "1px solid #e0e7ff" }}>
              <FolderKanban className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />
              <span className="font-semibold" style={{ fontSize: "13px", color: "#4338ca" }}>
                {projects.length} {projects.length === 1 ? "project" : "projects"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      {projects && projects.length > 4 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#94a3b8" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full rounded-xl bg-white pl-10 pr-4 py-2.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-300"
            style={{ border: "1px solid #e2e8f0" }}
          />
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-16 text-center" style={{ border: "2px dashed #e2e8f0" }}>
          <FolderKanban className="h-10 w-10 mx-auto mb-3" style={{ color: "#cbd5e1" }} />
          <p className="font-semibold mb-1" style={{ fontSize: "15px", color: "#334155" }}>
            {search ? "No matching projects" : "No projects available"}
          </p>
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>
            {search ? "Try a different search term." : "You don't have access to any project reports yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <ProjectReportCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectReportCard({ project }: { project: Project }) {
  const [from, to] = projectColor(project.name);
  const init = projectInitials(project.name);

  return (
    <Link
      to="/hierarchy/$projectId"
      params={{ projectId: project.id }}
      className="group rounded-2xl bg-white flex flex-col gap-4 transition-all hover:-translate-y-0.5 hover:shadow-lg no-underline overflow-hidden"
      style={{
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)",
      }}
    >
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />
      <div className="px-5 pb-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start gap-3.5">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center text-white text-sm font-extrabold shrink-0"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 4px 10px ${from}40` }}
          >
            {init}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="font-bold truncate" style={{ fontSize: "15px", color: "#0f172a" }}>
              {project.name}
            </h3>
            <p className="text-[11.5px] mt-0.5" style={{ color: "#94a3b8" }}>
              View summary report
            </p>
          </div>
        </div>

        {project.description ? (
          <p className="line-clamp-2 leading-relaxed flex-1" style={{ fontSize: "13px", color: "#64748b" }}>
            {project.description}
          </p>
        ) : (
          <p className="italic flex-1" style={{ fontSize: "13px", color: "#94a3b8" }}>
            No description provided.
          </p>
        )}

        <div className="flex items-center gap-4 pt-3"
          style={{ borderTop: "1px solid #f1f5f9", fontSize: "12px", color: "#94a3b8" }}>
          <span className="inline-flex items-center gap-1.5">
            <UsersIcon className="h-3.5 w-3.5" />
            <span className="font-semibold" style={{ color: "#334155" }}>{project.member_count ?? 0}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            <span className="font-semibold" style={{ color: "#334155" }}>{project.channel_count ?? 0}</span>
          </span>
          <span className="ml-auto inline-flex items-center gap-1 font-semibold transition-colors"
            style={{ color: "#6366f1", fontSize: "12px" }}>
            Open report
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
