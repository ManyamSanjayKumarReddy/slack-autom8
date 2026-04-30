import { createFileRoute, redirect, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Users as UsersIcon, Hash, FolderKanban, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/user-store";
import { invalidateProjectsCache, type Project } from "@/lib/projects-store";
import { projectColor, projectInitials } from "@/lib/project-colors";
import {
  PaginationControls,
  type PaginatedResponse,
} from "@/components/PaginationControls";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/projects")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: ProjectsPage,
});

function ProjectsPage() {
  const location = useLocation();

  if (location.pathname !== "/projects") {
    return <Outlet />;
  }

  return <ProjectsListPage />;
}


function ProjectsListPage() {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    document.title = "Projects — Slack Autom8";
  }, []);

  const fetchProjects = async (p = page, s = pageSize) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/projects/?page=${p}&page_size=${s}`);
      if (!res.ok) {
        await handleApiError(res, "Failed to load projects");
        setProjects([]);
        return;
      }
      const data = (await res.json()) as PaginatedResponse<Project>;
      const list = data.results ?? [];
      setProjects(list);
      setTotal(data.total ?? list.length);
      setTotalPages(data.total_pages ?? 1);
      setHasNext(Boolean(data.has_next));
      setHasPrevious(Boolean(data.has_previous));
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  return (
    <AppShell title="Projects">
      <div className="space-y-8">
        {/* Page banner */}
        <div
          className="rounded-2xl px-5 sm:px-8 py-5 sm:py-7 relative overflow-hidden border"
          style={{
            background: "var(--banner-bg)",
            borderColor: "var(--banner-border)",
          }}
        >
          <div
            className="absolute right-[-40px] top-[-50px] h-[200px] w-[200px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(18,100,163,0.14) 0%, transparent 70%)" }}
          />
          <div
            className="absolute right-[60px] bottom-[-30px] h-[120px] w-[120px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)" }}
          />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1
                className="font-extrabold mb-1.5"
                style={{ fontSize: "24px", color: "var(--banner-heading-color)", letterSpacing: "-0.025em" }}
              >
                Projects
              </h1>
              <p style={{ fontSize: "14px", color: "var(--banner-subtitle-color)" }}>
                {total > 0
                  ? `${total} project${total === 1 ? "" : "s"} in your workspace`
                  : "Workspaces you belong to and their summaries"}
              </p>
            </div>
            {isAdmin && (
              <Button
                onClick={() => setCreating(true)}
                className="shrink-0"
                style={{
                  background: "linear-gradient(135deg, #1264a3 0%, #0f5289 100%)",
                  boxShadow: "0 4px 14px rgba(18,100,163,0.35)",
                  border: "none",
                  color: "#fff",
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New Project
              </Button>
            )}
          </div>
        </div>

        {/* Project grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-44 w-full rounded-2xl" />
            ))}
          </div>
        ) : !projects || projects.length === 0 ? (
          <div
            className="rounded-2xl p-16 text-center bg-card"
            style={{ border: "2px dashed var(--color-border)" }}
          >
            <FolderKanban className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-semibold mb-1 text-foreground" style={{ fontSize: "15px" }}>
              No projects yet
            </p>
            <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
              {isAdmin
                ? 'Click "New Project" above to create your first one.'
                : "You haven't been added to any projects yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p) => (
              <ProjectCard key={p.slug} project={p} />
            ))}
          </div>
        )}

        {projects && projects.length > 0 && totalPages > 1 && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <PaginationControls
              page={page}
              total_pages={totalPages}
              has_next={hasNext}
              has_previous={hasPrevious}
              page_size={pageSize}
              onPageChange={(p) => {
                if (p < 1 || p > totalPages) return;
                setPage(p);
              }}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {creating && (
        <ProjectFormDialog
          open
          onOpenChange={(o) => {
            if (!o) setCreating(false);
          }}
          onSaved={() => {
            invalidateProjectsCache();
            fetchProjects();
          }}
        />
      )}
    </AppShell>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const [from, to] = projectColor(project.name);
  const initials = projectInitials(project.name);

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.slug }}
      className="group rounded-2xl bg-card flex flex-col gap-4 transition-all hover:-translate-y-0.5 hover:shadow-lg no-underline overflow-hidden border border-border"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)",
      }}
    >
      {/* Coloured top strip */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />

      <div className="px-5 pb-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start gap-3.5">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center text-white text-sm font-extrabold shrink-0"
            style={{
              background: `linear-gradient(135deg, ${from}, ${to})`,
              boxShadow: `0 4px 10px ${from}40`,
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3
              className="font-bold truncate transition-colors text-foreground"
              style={{ fontSize: "15px" }}
            >
              {project.name}
            </h3>
            <div className="flex flex-wrap gap-1 mt-1">
              {project.my_role && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                  {project.my_role === "team_lead" ? "Team Lead" : "Member"}
                </Badge>
              )}
              {project.complexity && (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={
                    project.complexity === "low"
                      ? { color: "#059669", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }
                      : project.complexity === "medium"
                      ? { color: "#d97706", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }
                      : { color: "#dc2626", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }
                  }
                >
                  {project.complexity === "low" ? "🟢" : project.complexity === "medium" ? "🟡" : "🔴"}{" "}
                  {project.complexity.charAt(0).toUpperCase() + project.complexity.slice(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        {project.description ? (
          <p
            className="line-clamp-2 leading-relaxed flex-1 text-muted-foreground"
            style={{ fontSize: "13px" }}
          >
            {project.description}
          </p>
        ) : (
          <p className="italic flex-1 text-muted-foreground/60" style={{ fontSize: "13px" }}>
            No description provided.
          </p>
        )}

        <div
          className="flex items-center gap-4 pt-3 border-t border-border text-muted-foreground"
          style={{ fontSize: "12px" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <UsersIcon className="h-3.5 w-3.5" />
            <span className="font-semibold text-foreground">
              {project.member_count ?? 0}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            <span className="font-semibold text-foreground">
              {project.channel_count ?? 0}
            </span>
          </span>
          <span className="ml-auto inline-flex items-center gap-1 truncate" style={{ fontSize: "11px" }}>
            {project.manager_name ? (
              <span className="font-medium text-muted-foreground">
                {project.manager_name}
              </span>
            ) : (
              <span className="italic text-muted-foreground/60">
                Unassigned
              </span>
            )}
            <ArrowRight
              className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-primary"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

function ProjectFormDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(`/projects/`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to create project");
        return;
      }
      toast.success("Project created");
      onSaved();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Add a new project. You can assign a manager and channels next.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Name</Label>
            <Input
              id="proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Scheduler Project"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Description</Label>
            <Textarea
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
