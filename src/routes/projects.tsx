import { createFileRoute, redirect, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Users as UsersIcon, Hash } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/user-store";
import { invalidateProjectsCache, type Project } from "@/lib/projects-store";
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
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    document.title = "Projects — Slack Summarizer";
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
    <AppShell title="Projects" subtitle="Workspaces you belong to and their summaries.">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total} project${total === 1 ? "" : "s"}` : ""}
          </p>
          {isAdmin && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Project
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : !projects || projects.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-card p-16 text-center text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            {isAdmin
              ? "No projects yet. Click \"New Project\" to create one."
              : "You haven't been added to any projects yet."}
          </section>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
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
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="group rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {project.name}
        </h3>
        {project.my_role && (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {project.my_role === "team_lead" ? "Team Lead" : "Member"}
          </Badge>
        )}
      </div>
      {project.description ? (
        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">No description</p>
      )}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
        <span className="inline-flex items-center gap-1">
          <UsersIcon className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{project.member_count ?? 0}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Hash className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{project.channel_count ?? 0}</span>
        </span>
        <span className="ml-auto truncate">
          Manager:{" "}
          <span className={project.manager_name ? "text-foreground" : "italic"}>
            {project.manager_name || "Unassigned"}
          </span>
        </span>
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
