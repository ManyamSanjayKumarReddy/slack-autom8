import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Hash,
  Users as UsersIcon,
  FileText,
  LayoutGrid,
  Pencil,
  Trash2,
  Sparkles,
  UserPlus,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/user-store";
import { invalidateProjectsCache, type ProjectRole } from "@/lib/projects-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { isOneOf } from "@/lib/roles";
import { GenerateProjectSummaryDialog } from "@/components/summaries/GenerateProjectSummaryDialog";
import { GroupedSummariesView } from "@/components/summaries/GroupedSummariesView";
import { UserSearchPicker, type SearchUser } from "@/components/UserSearchPicker";

const PROJECT_GRADIENTS = [
  ["#8b5cf6", "#6366f1"],
  ["#3b82f6", "#2563eb"],
  ["#10b981", "#0d9488"],
  ["#f59e0b", "#d97706"],
  ["#ec4899", "#db2777"],
  ["#14b8a6", "#0891b2"],
  ["#f97316", "#ea580c"],
  ["#84cc16", "#16a34a"],
];
function projectColor(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PROJECT_GRADIENTS[h % PROJECT_GRADIENTS.length] as [string, string];
}

interface ProjectDetail {
  id: string;
  name: string;
  description?: string;
  member_count?: number;
  channel_count?: number;
  manager_id?: string | null;
  manager_name?: string | null;
  my_role?: ProjectRole;
  created_at?: string;
}

interface ProjectChannel {
  channel_id: string;
  channel_name: string;
  added_at?: string;
}

interface ProjectMember {
  user_id: string;
  name: string;
  email: string;
  project_role: ProjectRole;
  joined_at?: string;
}

interface WorkspaceChannel {
  id: string;
  name: string;
  is_private: boolean;
  num_members: number;
}

export const Route = createFileRoute("/projects/$projectId")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    document.title = "Project — Slack Autom8";
  }, []);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/projects/${projectId}`);
      if (!res.ok) {
        await handleApiError(res, "Failed to load project");
        setProject(null);
        return;
      }
      setProject(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const isAdmin = user?.role === "admin";
  const isManagerOrAdmin = isOneOf(user?.role, ["manager", "admin"]);
  const isTeamLead = project?.my_role === "team_lead";
  const canManage = isManagerOrAdmin;
  // Admins and managers do NOT have personal summaries — only employees do.
  const hasPersonalSummaries = user?.role === "employee";
  // Project summaries: admin, manager, and project team_leads.
  const canGenerateProjectSummary = isManagerOrAdmin || isTeamLead;

  const handleDelete = async () => {
    try {
      const res = await apiFetch(`/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) {
        await handleApiError(res, "Failed to delete project");
        return;
      }
      toast.success("Project deleted");
      invalidateProjectsCache();
      navigate({ to: "/projects" });
    } finally {
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <AppShell maxWidth="max-w-5xl">
        <Skeleton className="h-32 w-full rounded-2xl" />
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell maxWidth="max-w-5xl">
        <Link to="/projects" className="text-sm hover:underline" style={{ color: "#6366f1" }}>
          ← Back to projects
        </Link>
      </AppShell>
    );
  }

  const [projFrom, projTo] = projectColor(project.name);
  const projInitials = project.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <AppShell maxWidth="max-w-5xl">
      <div className="space-y-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 transition-colors hover:opacity-75"
          style={{ fontSize: "13.5px", color: "#64748b" }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to projects
        </Link>

        {/* Project header banner */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid #e0e7ff", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)" }}
        >
          {/* Colored top strip */}
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${projFrom}, ${projTo})` }} />

          <div
            className="px-7 py-6 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #eef2ff 0%, #f5f7ff 60%, #f6f8fc 100%)" }}
          >
            <div
              className="absolute right-[-30px] top-[-40px] h-[180px] w-[180px] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 70%)" }}
            />
            <div className="relative flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar */}
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-sm font-extrabold shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${projFrom}, ${projTo})`,
                    boxShadow: `0 4px 10px ${projFrom}40`,
                  }}
                >
                  {projInitials}
                </div>
                <div className="min-w-0">
                  <h1
                    className="font-extrabold mb-1"
                    style={{ fontSize: "22px", color: "#0f172a", letterSpacing: "-0.025em" }}
                  >
                    {project.name}
                  </h1>
                  {project.description && (
                    <p style={{ fontSize: "13.5px", color: "#64748b" }}>{project.description}</p>
                  )}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      <UsersIcon className="h-3 w-3 mr-1" />
                      {project.member_count ?? 0} members
                    </Badge>
                    <Badge variant="outline">
                      <Hash className="h-3 w-3 mr-1" />
                      {project.channel_count ?? 0} channels
                    </Badge>
                    {project.manager_name && (
                      <Badge variant="outline">Manager: {project.manager_name}</Badge>
                    )}
                    {project.my_role && (
                      <Badge>
                        {project.my_role === "team_lead" ? "Team Lead" : "Member"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="overview">
                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="channels">
                <Hash className="h-3.5 w-3.5 mr-1.5" /> Channels
              </TabsTrigger>
              <TabsTrigger value="members">
                <UsersIcon className="h-3.5 w-3.5 mr-1.5" /> Members
              </TabsTrigger>
              <TabsTrigger value="summaries">
                <FileText className="h-3.5 w-3.5 mr-1.5" /> Summaries
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <OverviewTab project={project} isAdmin={isAdmin} onChanged={fetchProject} />
          </TabsContent>
          <TabsContent value="channels">
            <ChannelsTab projectId={projectId} canManage={canManage} onChanged={fetchProject} />
          </TabsContent>
          <TabsContent value="members">
            <MembersTab projectId={projectId} canManage={canManage} onChanged={fetchProject} />
          </TabsContent>
          <TabsContent value="summaries" className="space-y-4">
            <SummariesSection
              projectId={projectId}
              hasPersonalSummaries={hasPersonalSummaries}
              canGenerateProjectSummary={canGenerateProjectSummary}
            />
          </TabsContent>
        </Tabs>
      </div>

      {editing && (
        <EditProjectDialog
          project={project}
          onOpenChange={(o) => !o && setEditing(false)}
          onSaved={() => {
            invalidateProjectsCache();
            fetchProject();
          }}
        />
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              "{project.name}" will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

/* ----------------------- Overview ----------------------- */

function OverviewTab({
  project,
  isAdmin,
  onChanged,
}: {
  project: ProjectDetail;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [assigning, setAssigning] = useState(false);

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] space-y-4">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Manager</dt>
          <dd className="mt-1 flex items-center gap-2">
            <span className={project.manager_name ? "text-foreground" : "italic text-muted-foreground"}>
              {project.manager_name || "Unassigned"}
            </span>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setAssigning(true)}>
                {project.manager_id ? "Change" : "Assign"}
              </Button>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Members</dt>
          <dd className="mt-1 text-foreground">{project.member_count ?? 0}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Channels</dt>
          <dd className="mt-1 text-foreground">{project.channel_count ?? 0}</dd>
        </div>
        {project.created_at && (
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Created</dt>
            <dd className="mt-1 text-foreground">
              {new Date(project.created_at).toLocaleDateString()}
            </dd>
          </div>
        )}
      </dl>

      {assigning && (
        <Dialog open onOpenChange={(o) => !o && setAssigning(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign manager</DialogTitle>
              <DialogDescription>
                Search for a user with the manager role.
              </DialogDescription>
            </DialogHeader>
            <UserSearchPicker
              role="manager"
              placeholder="Search managers…"
              onSelect={async (u) => {
                try {
                  const res = await apiFetch(`/projects/${project.id}/manager`, {
                    method: "PUT",
                    body: JSON.stringify({ manager_id: u.id }),
                  });
                  if (!res.ok) {
                    await handleApiError(res, "Failed to assign manager");
                    return;
                  }
                  toast.success(`Assigned ${u.name} as manager`);
                  onChanged();
                  setAssigning(false);
                } catch {
                  toast.error("Network error");
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

function EditProjectDialog({
  project,
  onOpenChange,
  onSaved,
}: {
  project: ProjectDetail;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(`/projects/${project.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to update project");
        return;
      }
      toast.success("Project updated");
      onSaved();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ep-name">Name</Label>
            <Input id="ep-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ep-desc">Description</Label>
            <Textarea
              id="ep-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------- Channels ----------------------- */

function ChannelsTab({
  projectId,
  canManage,
  onChanged,
}: {
  projectId: string;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [channels, setChannels] = useState<ProjectChannel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/projects/${projectId}/channels`);
      if (!res.ok) {
        await handleApiError(res, "Failed to load channels");
        setChannels([]);
        return;
      }
      const data = (await res.json()) as
        | { channels?: ProjectChannel[]; results?: ProjectChannel[] }
        | ProjectChannel[];
      const list = Array.isArray(data)
        ? data
        : (data.channels ?? data.results ?? []);
      setChannels(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleRemove = async (channelId: string) => {
    setRemovingId(channelId);
    try {
      const res = await apiFetch(`/projects/${projectId}/channels/${channelId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to remove channel");
        return;
      }
      toast.success("Channel removed");
      await fetchChannels();
      onChanged();
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-foreground">
          {channels ? `${channels.length} channels` : "Channels"}
        </h2>
        {canManage && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add channel
          </Button>
        )}
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !channels || channels.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          No channels in this project yet.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {channels.map((c) => (
            <li
              key={c.channel_id}
              className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground">#</span>
                <span className="text-sm font-medium text-foreground truncate">
                  {c.channel_name}
                </span>
                {c.added_at && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    · added {new Date(c.added_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              {canManage && (
                <button
                  onClick={() => handleRemove(c.channel_id)}
                  disabled={removingId === c.channel_id}
                  className="text-xs text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
                >
                  {removingId === c.channel_id ? "Removing…" : "Remove"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <AddChannelDialog
          projectId={projectId}
          existing={channels ?? []}
          onOpenChange={(o) => !o && setAdding(false)}
          onAdded={async () => {
            await fetchChannels();
            onChanged();
          }}
        />
      )}
    </section>
  );
}

function AddChannelDialog({
  projectId,
  existing,
  onOpenChange,
  onAdded,
}: {
  projectId: string;
  existing: ProjectChannel[];
  onOpenChange: (o: boolean) => void;
  onAdded: () => void;
}) {
  const [channels, setChannels] = useState<WorkspaceChannel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const existingIds = new Set(existing.map((c) => c.channel_id));

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/channels/?page=1&page_size=200`);
        if (res.ok) {
          const data = (await res.json()) as { results?: WorkspaceChannel[] };
          setChannels(data.results ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAdd = async (c: WorkspaceChannel) => {
    setSavingId(c.id);
    try {
      const res = await apiFetch(`/projects/${projectId}/channels`, {
        method: "POST",
        body: JSON.stringify({ channel_id: c.id, channel_name: c.name }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to add channel");
        return;
      }
      toast.success(`#${c.name} added`);
      existingIds.add(c.id);
      onAdded();
    } finally {
      setSavingId(null);
    }
  };

  const filtered = (channels ?? []).filter((c) =>
    c.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add channels</DialogTitle>
          <DialogDescription>
            Pick channels from your Slack workspace to add to this project.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search channels…"
          autoFocus
        />
        <div className="flex-1 overflow-y-auto rounded-lg border border-border">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No channels found.</div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((c) => {
                const inProject = existingIds.has(c.id);
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {c.is_private ? "🔒 " : "# "}
                        {c.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.num_members} members
                      </div>
                    </div>
                    {inProject ? (
                      <Badge variant="outline" className="shrink-0">
                        Added
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdd(c)}
                        disabled={savingId === c.id}
                      >
                        {savingId === c.id ? "Adding…" : "Add"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------- Members ----------------------- */

function MembersTab({
  projectId,
  canManage,
  onChanged,
}: {
  projectId: string;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [members, setMembers] = useState<ProjectMember[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ProjectMember | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/projects/${projectId}/members`);
      if (!res.ok) {
        await handleApiError(res, "Failed to load members");
        setMembers([]);
        return;
      }
      const data = (await res.json()) as { results?: ProjectMember[] } | ProjectMember[];
      setMembers(Array.isArray(data) ? data : (data.results ?? []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleRemove = async (m: ProjectMember) => {
    try {
      const res = await apiFetch(`/projects/${projectId}/members/${m.user_id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to remove member");
        return;
      }
      toast.success(`${m.name} removed`);
      await fetchMembers();
      onChanged();
    } finally {
      setConfirmRemove(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-foreground">
          {members ? `${members.length} members` : "Members"}
        </h2>
        {canManage && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Add member
          </Button>
        )}
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !members || members.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          No members yet.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-wrap"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{m.name}</div>
                <div className="text-xs text-muted-foreground truncate">{m.email}</div>
              </div>
              <Badge variant="outline" className="shrink-0">
                {m.project_role === "team_lead" ? "Team Lead" : "Employee"}
              </Badge>
              {canManage && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setEditingMember(m)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmRemove(m)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <AddMemberDialog
          projectId={projectId}
          existing={members ?? []}
          onOpenChange={(o) => !o && setAdding(false)}
          onAdded={async () => {
            await fetchMembers();
            onChanged();
          }}
        />
      )}

      {editingMember && (
        <EditMemberRoleDialog
          projectId={projectId}
          member={editingMember}
          onOpenChange={(o) => !o && setEditingMember(null)}
          onSaved={async () => {
            await fetchMembers();
            onChanged();
          }}
        />
      )}

      <AlertDialog
        open={confirmRemove !== null}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this member?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemove?.name} will be removed from this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmRemove) handleRemove(confirmRemove);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function AddMemberDialog({
  projectId,
  existing,
  onOpenChange,
  onAdded,
}: {
  projectId: string;
  existing: ProjectMember[];
  onOpenChange: (o: boolean) => void;
  onAdded: () => void;
}) {
  const [pending, setPending] = useState<SearchUser | null>(null);
  const [role, setRole] = useState<ProjectRole>("employee");
  const [submitting, setSubmitting] = useState(false);
  const excluded = existing.map((m) => m.user_id);

  const handleConfirm = async () => {
    if (!pending) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({ user_id: pending.id, project_role: role }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to add member");
        return;
      }
      toast.success(`${pending.name} added`);
      onAdded();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>
            Search for a user, then choose their project role.
          </DialogDescription>
        </DialogHeader>
        {!pending ? (
          <UserSearchPicker
            placeholder="Search users…"
            excludeIds={excluded}
            onSelect={(u) => setPending(u)}
          />
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="text-sm font-medium text-foreground">{pending.name}</div>
              <div className="text-xs text-muted-foreground">{pending.email}</div>
            </div>
            <div className="space-y-1.5">
              <Label>Project role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as ProjectRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPending(null)}>
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={submitting}>
                {submitting ? "Adding…" : "Add"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditMemberRoleDialog({
  projectId,
  member,
  onOpenChange,
  onSaved,
}: {
  projectId: string;
  member: ProjectMember;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<ProjectRole>(member.project_role);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/projects/${projectId}/members/${member.user_id}/role`, {
        method: "PUT",
        body: JSON.stringify({ project_role: role }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to update role");
        return;
      }
      toast.success("Role updated");
      onSaved();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change project role</DialogTitle>
          <DialogDescription>
            Update {member.name}'s role within this project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Project role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as ProjectRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="team_lead">Team Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || role === member.project_role}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------- Summaries ----------------------- */

function SummariesSection({
  projectId,
  hasPersonalSummaries,
  canGenerateProjectSummary,
}: {
  projectId: string;
  hasPersonalSummaries: boolean;
  canGenerateProjectSummary: boolean;
}) {
  // Default scope: personal if user has it, otherwise project.
  const initialScope: "personal" | "project" = hasPersonalSummaries
    ? "personal"
    : "project";
  const [scope, setScope] = useState<"personal" | "project">(initialScope);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [polling, setPolling] = useState(false);

  // If a user can't access the current scope (e.g. admin landing on personal),
  // snap to the allowed one.
  useEffect(() => {
    if (scope === "personal" && !hasPersonalSummaries) setScope("project");
    if (scope === "project" && !canGenerateProjectSummary && hasPersonalSummaries) {
      setScope("personal");
    }
  }, [scope, hasPersonalSummaries, canGenerateProjectSummary]);

  const showTabs = hasPersonalSummaries && canGenerateProjectSummary;
  const canGenerateCurrent =
    scope === "personal" ? hasPersonalSummaries : canGenerateProjectSummary;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[var(--shadow-card)] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {showTabs ? (
            <Tabs value={scope} onValueChange={(v) => setScope(v as "personal" | "project")}>
              <TabsList>
                <TabsTrigger value="personal">My Summaries</TabsTrigger>
                <TabsTrigger value="project">Project Summaries</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <h3 className="text-sm font-semibold text-foreground">
              {scope === "personal" ? "My Summaries" : "Project Summaries"}
            </h3>
          )}
        </div>
        {canGenerateCurrent && (
          <Button onClick={() => setGenerateOpen(true)} disabled={polling}>
            {polling ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1.5" />
            )}
            {scope === "personal" ? "Generate My Summary" : "Generate Project Summary"}
          </Button>
        )}
      </div>

      <GroupedSummariesView
        projectId={projectId}
        scope={scope}
        refreshKey={refreshKey}
        canDelete={scope === "personal"}
        poll={polling}
        onPollComplete={() => setPolling(false)}
      />

      {generateOpen && (
        <GenerateProjectSummaryDialog
          open={generateOpen}
          onOpenChange={setGenerateOpen}
          projectId={projectId}
          scope={scope}
          onStarted={() => {
            setRefreshKey((k) => k + 1);
            setPolling(true);
          }}
        />
      )}
    </div>
  );
}
