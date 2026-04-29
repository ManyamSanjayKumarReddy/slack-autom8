import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
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
  CalendarIcon,
  RefreshCw,
  FileSearch,
  ChevronDown,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/lib/user-store";
import { invalidateProjectsCache, type ProjectRole } from "@/lib/projects-store";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { projectColor, projectInitials } from "@/lib/project-colors";
import { nameToGradient, nameInitials } from "@/lib/avatar-colors";
import { GenerateProjectSummaryDialog } from "@/components/summaries/GenerateProjectSummaryDialog";
import { SlackStyleFeed, type FeedRow } from "@/components/summaries/SlackStyleFeed";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserSearchPicker, type SearchUser } from "@/components/UserSearchPicker";

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
      <AppShell title="Loading…">
        <Skeleton className="h-32 w-full rounded-2xl" />
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell title="Project not found">
        <p className="text-sm text-muted-foreground">Project not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={project.name} subtitle={project.description ?? undefined}>
      <ProjectTabs
        project={project}
        projectId={projectId}
        isAdmin={isAdmin}
        canManage={canManage}
        fetchProject={fetchProject}
        userRole={user?.role}
        projectRole={project?.my_role}
        onEdit={() => setEditing(true)}
        onDelete={() => setConfirmDelete(true)}
      />

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

/* ----------------------- Slack-style Tab Bar ----------------------- */

type ProjectTabKey = "overview" | "summaries";

function ProjectTabs({
  project,
  projectId,
  isAdmin,
  canManage,
  fetchProject,
  userRole,
  projectRole,
  onEdit,
  onDelete,
}: {
  project: ProjectDetail;
  projectId: string;
  isAdmin: boolean;
  canManage: boolean;
  fetchProject: () => void;
  userRole: string | undefined;
  projectRole: ProjectRole | undefined;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ProjectTabKey>("overview");

  const tabs: { key: ProjectTabKey; label: string; icon: typeof LayoutGrid }[] = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "summaries", label: "Summaries", icon: FileText },
  ];

  return (
    <div className="-mt-6 sm:-mt-7">
      <div className="flex items-center border-b border-border bg-transparent px-0 -mx-5 sm:-mx-8">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={
                "inline-flex items-center gap-1.5 px-5 py-3.5 text-[14px] font-medium whitespace-nowrap transition-colors border-b-2 -mb-px " +
                (active
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <>
          <OverviewTab
            project={project}
            isAdmin={isAdmin}
            canManage={canManage}
            onChanged={fetchProject}
            onEdit={onEdit}
            onDelete={onDelete}
          />

          <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-5 pb-10">
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <ChannelsTab projectId={projectId} canManage={canManage} onChanged={fetchProject} />
            </div>
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <MembersTab projectId={projectId} canManage={canManage} onChanged={fetchProject} />
            </div>
          </div>
        </>
      )}

      {activeTab === "summaries" && (
        <SummariesSection
          projectId={projectId}
          userRole={userRole}
          projectRole={projectRole}
        />
      )}
    </div>
  );
}

/* ----------------------- Overview ----------------------- */


function OverviewTab({
  project,
  isAdmin,
  canManage,
  onChanged,
  onEdit,
  onDelete,
}: {
  project: ProjectDetail;
  isAdmin: boolean;
  canManage: boolean;
  onChanged: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [assigning, setAssigning] = useState(false);
  const [renamingSlug, setRenamingSlug] = useState(false);

  return (
    <div className="pt-5 pb-2">
      {/* Project header card — description + contextual actions + stats */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-6">
        {/* Description row with inline icon-only action buttons */}
        <div className="flex items-start gap-4 px-7 pt-7 pb-6">
          <div className="flex-1 min-w-0">
            {project.description ? (
              <p className="text-[16px] text-foreground/80 leading-relaxed">{project.description}</p>
            ) : (
              <p className="text-[16px] italic text-muted-foreground">No description provided.</p>
            )}
          </div>
          {canManage && (
            <div className="flex items-center gap-1 shrink-0 -mt-0.5">
              <button
                onClick={onEdit}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Edit project"
              >
                <Pencil className="h-[17px] w-[17px]" />
              </button>
              <button
                onClick={() => setRenamingSlug(true)}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Rename project slug"
              >
                <Hash className="h-[17px] w-[17px]" />
              </button>
              {isAdmin && (
                <button
                  onClick={onDelete}
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Delete project"
                >
                  <Trash2 className="h-[17px] w-[17px]" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stats — Slack channel-info panel style: no heavy boxes, just label + value */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5 px-7 py-6 border-t border-border">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Manager</div>
            <div className={`text-[14px] font-medium leading-snug ${project.manager_name ? "text-foreground" : "italic text-muted-foreground"}`}>
              {project.manager_name || "Unassigned"}
            </div>
            {isAdmin && (
              <button
                onClick={() => setAssigning(true)}
                className="text-[11.5px] text-primary hover:underline mt-0.5 font-medium"
              >
                {project.manager_id ? "change" : "assign"}
              </button>
            )}
          </div>

          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Members</div>
            <div className="text-[22px] font-bold text-foreground leading-none">{project.member_count ?? 0}</div>
          </div>

          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Channels</div>
            <div className="text-[22px] font-bold text-foreground leading-none">{project.channel_count ?? 0}</div>
          </div>

          {project.created_at && (
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Created</div>
              <div className="text-[14px] font-medium text-foreground">{new Date(project.created_at).toLocaleDateString()}</div>
            </div>
          )}
        </div>
      </div>

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

      {renamingSlug && (
        <RenameSlugDialog
          project={project}
          onOpenChange={(o) => { if (!o) setRenamingSlug(false); }}
          onSaved={(newSlug) => {
            setRenamingSlug(false);
            onChanged();
            invalidateProjectsCache();
            if (newSlug !== project.id) {
              window.history.replaceState(null, "", `/projects/${newSlug}`);
              window.location.reload();
            }
          }}
        />
      )}
    </div>
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
  const [confirmRemoveChannel, setConfirmRemoveChannel] = useState<ProjectChannel | null>(null);

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

  const handleRemove = async (channel: ProjectChannel) => {
    setRemovingId(channel.channel_id);
    try {
      const res = await apiFetch(`/projects/${projectId}/channels/${channel.channel_id}`, {
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
      setConfirmRemoveChannel(null);
    }
  };

  return (
    <div>
      <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <Hash className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-foreground leading-none">Channels</h2>
            {channels !== null && (
              <p className="text-[12px] text-muted-foreground mt-1">
                {channels.length} {channels.length === 1 ? "channel" : "channels"}
              </p>
            )}
          </div>
        </div>
        {canManage && (
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
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
              className="flex items-center justify-between gap-3 py-4 px-6 hover:bg-muted/30 transition-colors min-h-[56px]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 font-semibold text-[15px]">
                  #
                </span>
                <div className="min-w-0">
                  <span className="text-[15px] font-semibold text-foreground truncate block">
                    {c.channel_name}
                  </span>
                  {c.added_at && (
                    <span className="text-[12px] text-muted-foreground">
                      added {new Date(c.added_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => setConfirmRemoveChannel(c)}
                  disabled={removingId === c.channel_id}
                  className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
                  title="Remove channel"
                >
                  {removingId === c.channel_id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
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

      <AlertDialog
        open={confirmRemoveChannel !== null}
        onOpenChange={(o) => !o && setConfirmRemoveChannel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this channel?</AlertDialogTitle>
            <AlertDialogDescription>
              #{confirmRemoveChannel?.channel_name} will be removed from this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmRemoveChannel) handleRemove(confirmRemoveChannel);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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

function MemberAvatar({ name }: { name: string }) {
  return (
    <span
      className="h-9 w-9 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0 select-none"
      style={{ background: nameToGradient(name), boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
    >
      {nameInitials(name)}
    </span>
  );
}

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
    <div>
      <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-foreground leading-none">Members</h2>
            {members !== null && (
              <p className="text-[12px] text-muted-foreground mt-1">
                {members.length} {members.length === 1 ? "member" : "members"}
              </p>
            )}
          </div>
        </div>
        {canManage && (
          <Button variant="outline" onClick={() => setAdding(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
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
              className="group/member flex items-center gap-3 py-3.5 px-6 hover:bg-muted/20 transition-colors"
            >
              <MemberAvatar name={m.name} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-foreground truncate leading-snug">{m.name}</div>
                {/* Email — smaller and muted, not as prominent */}
                <div className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{m.email}</div>
              </div>
              {/* Role badge — subtle outlined chip */}
              <span
                className={`shrink-0 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${
                  m.project_role === "team_lead"
                    ? "border-primary/30 text-primary bg-primary/8"
                    : "border-border text-muted-foreground"
                }`}
              >
                {m.project_role === "team_lead" ? "Team Lead" : "Employee"}
              </span>
              {/* Edit/remove — hidden until hover, Slack-style */}
              {canManage && (
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/member:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingMember(m)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Edit role"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setConfirmRemove(m)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Remove member"
                  >
                    <X className="h-3 w-3" />
                  </button>
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
    </div>
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

// Unified list API response types
interface UnifiedSummaryItem {
  kind: "personal" | "project";
  id: string;
  user_id?: string;
  user_name?: string;
  triggered_by_id?: string;
  triggered_by_name?: string;
  summary_text: string;
  message_count: number;
  channel_ids?: string[];
  from_date?: string;
  to_date?: string;
  created_at: string;
  is_auto_generated?: boolean;
}

interface UsageInfo {
  used_this_week: number;
  weekly_limit: number;
  remaining: number;
}

interface UnifiedListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  results?: UnifiedSummaryItem[];
  project_id?: string;
  project_name?: string;
  usage?: UsageInfo;
  grouped_by_date?: Record<string, UnifiedSummaryItem[]>;
}

function mapToFeedRow(item: UnifiedSummaryItem, date: string): FeedRow {
  const rowKey = `${item.kind}-${item.id}-${date}`;
  if (item.kind === "personal") {
    return {
      id: item.id,
      rowKey,
      date,
      created_at: item.created_at,
      summary_text: item.summary_text,
      message_count: item.message_count,
      is_auto_generated: item.is_auto_generated,
      type: "personal",
      member_name: item.user_name,
    };
  }
  return {
    id: item.id,
    rowKey,
    date,
    created_at: item.created_at,
    summary_text: item.summary_text,
    message_count: item.message_count,
    is_auto_generated: item.is_auto_generated,
    type: "project",
    member_name: item.triggered_by_name,
  };
}

function fmtRange(r: DateRange | undefined): string {
  if (!r?.from) return "Pick dates";
  if (!r.to || r.from.toDateString() === r.to.toDateString())
    return format(r.from, "MMM d, yyyy");
  return `${format(r.from, "MMM d")} – ${format(r.to, "MMM d, yyyy")}`;
}

type QuickKey = "today" | "yesterday" | "last7" | "last30" | "custom";
type SummaryTab = "user" | "project";
type TypeFilter = "all" | "auto" | "manual";

function SummariesSection({
  projectId,
  userRole,
  projectRole,
}: {
  projectId: string;
  userRole: string | undefined;
  projectRole: ProjectRole | undefined;
}) {
  const isMobile = useIsMobile();

  // Role-based capability flags
  const isEmployee = userRole === "employee";
  const isTeamLead = projectRole === "team_lead";
  const isManagerOrAdmin = userRole === "manager" || userRole === "admin";
  // employee + team_lead can generate personal summaries
  const canGeneratePersonal = isEmployee || isTeamLead;
  // team_lead, manager, admin can access project summaries tab
  const canAccessProjectTab = isTeamLead || isManagerOrAdmin;
  // team_lead, manager, admin can generate project summaries
  const canGenerateProject = isTeamLead || isManagerOrAdmin;
  // team_lead, manager, admin see member filter on user tab
  const canFilterByMember = isTeamLead || isManagerOrAdmin;

  // Tabs, filters, date range
  const [tab, setTab] = useState<SummaryTab>("user");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("auto");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);

  const today = new Date();
  const [range, setRange] = useState<DateRange | undefined>({ from: today, to: today });
  const [activeQuick, setActiveQuick] = useState<QuickKey>("today");
  const [calOpen, setCalOpen] = useState(false);

  // Data
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  // Generate + polling
  const [generateOpen, setGenerateOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const taskTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load project members for member filter (team_lead / manager / admin)
  useEffect(() => {
    if (!canFilterByMember) return;
    apiFetch(`/projects/${projectId}/members`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setMembers(Array.isArray(data) ? data : (data.results ?? []));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Fetch usage on mount
  useEffect(() => {
    apiFetch("/summaries/usage")
      .then(async (res) => { if (res.ok) setUsage(await res.json()); })
      .catch(() => {});
  }, []);

  const fetchData = async (opts?: {
    tab?: SummaryTab;
    typeFilter?: TypeFilter;
    memberIds?: string[];
    range?: DateRange;
  }) => {
    const activeTab = opts?.tab ?? tab;
    const activeType = opts?.typeFilter ?? typeFilter;
    const activeMemIds = opts?.memberIds ?? memberIds;
    const activeRange = opts?.range ?? range;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("scope", activeTab === "user" ? "personal" : "project");
      if (activeType !== "all") params.set("type", activeType);
      for (const id of activeMemIds) params.append("member_id", id);
      if (activeRange?.from) params.set("from_date", format(activeRange.from, "yyyy-MM-dd"));
      if (activeRange?.to) params.set("to_date", format(activeRange.to, "yyyy-MM-dd"));
      params.set("page_size", "50");

      const res = await apiFetch(`/summaries/projects/${projectId}?${params}`);
      if (!res.ok) {
        await handleApiError(res, "Failed to load summaries");
        setRows([]);
        setHasData(false);
        return;
      }
      const json = (await res.json()) as UnifiedListResponse;
      if (json.usage) setUsage(json.usage);

      const flat: FeedRow[] = [];
      for (const [date, items] of Object.entries(json.grouped_by_date ?? {})) {
        for (const item of items) flat.push(mapToFeedRow(item, date));
      }
      flat.sort((a, b) => {
        if (a.date !== b.date) return a.date > b.date ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setRows(flat);
      setHasData(flat.length > 0);
    } catch {
      setRows([]);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData({ range: { from: today, to: today } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Task polling
  useEffect(() => {
    if (!taskId) return;
    const poll = async () => {
      try {
        const res = await apiFetch(`/summaries/tasks/${taskId}`);
        if (!res.ok) { setTaskId(null); return; }
        const result = await res.json() as {
          task_id: string;
          status: "processing" | "done" | "failed";
          error?: string;
        };
        if (result.status === "done") {
          setTaskId(null);
          toast.success("Summary ready");
          await fetchData();
          apiFetch("/summaries/usage").then(async (r) => { if (r.ok) setUsage(await r.json()); }).catch(() => {});
        } else if (result.status === "failed") {
          setTaskId(null);
          toast.error(result.error ?? "Summary generation failed.");
        } else {
          taskTimer.current = setTimeout(poll, 3500);
        }
      } catch {
        taskTimer.current = setTimeout(poll, 3500);
      }
    };
    taskTimer.current = setTimeout(poll, 3500);
    return () => { if (taskTimer.current) clearTimeout(taskTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const applyQuick = (key: QuickKey) => {
    setActiveQuick(key);
    let r: DateRange;
    if (key === "today") {
      r = { from: new Date(), to: new Date() };
    } else if (key === "yesterday") {
      const y = new Date(); y.setDate(y.getDate() - 1);
      r = { from: y, to: y };
    } else if (key === "last7") {
      const s = new Date(); s.setDate(s.getDate() - 6);
      r = { from: s, to: new Date() };
    } else {
      const s = new Date(); s.setDate(s.getDate() - 29);
      r = { from: s, to: new Date() };
    }
    setRange(r);
    fetchData({ range: r });
  };

  const handleTabChange = (newTab: SummaryTab) => {
    setTab(newTab);
    setTypeFilter("auto");
    setMemberIds([]);
    fetchData({ tab: newTab, typeFilter: "auto", memberIds: [] });
  };

  const handleTypeChange = (t: TypeFilter) => {
    setTypeFilter(t);
    fetchData({ typeFilter: t });
  };

  const handleMemberToggle = (id: string) => {
    const next = memberIds.includes(id)
      ? memberIds.filter((x) => x !== id)
      : [...memberIds, id];
    setMemberIds(next);
    fetchData({ memberIds: next });
  };

  const handleClearMembers = () => {
    setMemberIds([]);
    setMemberPickerOpen(false);
    fetchData({ memberIds: [] });
  };

  const handleDelete = async (row: FeedRow) => {
    setDeletingId(row.id);
    try {
      const endpoint = row.type === "personal"
        ? `/summaries/projects/${projectId}/personal/${row.id}`
        : `/summaries/projects/${projectId}/project/${row.id}`;
      const res = await apiFetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        await handleApiError(res, "Failed to delete summary");
        return;
      }
      toast.success("Summary deleted");
      await fetchData();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const isPolling = taskId !== null;
  const canGenerateCurrent = tab === "user" ? canGeneratePersonal : canGenerateProject;

  const TYPE_OPTS: { value: TypeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "auto", label: "Auto" },
    { value: "manual", label: "Manual" },
  ];

  const QUICK_PICKS: { label: string; key: QuickKey }[] = [
    { label: "Today", key: "today" },
    { label: "Yesterday", key: "yesterday" },
    { label: "Last 7 days", key: "last7" },
    { label: "Last 30 days", key: "last30" },
  ];

  return (
    <div className="space-y-4">
      {/* Header: sub-tabs + generate button */}
      <div className="flex items-center justify-between gap-3 flex-wrap py-3">
        <div className="flex items-center gap-2">
          {canAccessProjectTab ? (
            <Tabs value={tab} onValueChange={(v) => handleTabChange(v as SummaryTab)}>
              <TabsList>
                <TabsTrigger value="user">User Summaries</TabsTrigger>
                <TabsTrigger value="project">Project Summaries</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <h3 className="text-base font-semibold text-foreground">User Summaries</h3>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Usage pill */}
          {usage && (
            <div
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium"
              style={{
                borderColor: usage.remaining === 0 ? "rgba(239,68,68,0.4)" : "var(--color-border)",
                background: usage.remaining === 0 ? "rgba(239,68,68,0.08)" : "var(--muted)",
                color: usage.remaining === 0 ? "#ef4444" : usage.remaining <= 2 ? "#f59e0b" : "var(--muted-foreground)",
              }}
            >
              <Zap className="h-3 w-3" />
              <span>
                {usage.remaining === 0 ? "No generations left" : `${usage.remaining} generation${usage.remaining === 1 ? "" : "s"} left`}
                <span className="opacity-60 ml-1">({usage.used_this_week}/{usage.weekly_limit})</span>
              </span>
            </div>
          )}
          {canGenerateCurrent && (
            <Button onClick={() => setGenerateOpen(true)} disabled={isPolling}>
              {isPolling ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1.5" />
              )}
              {tab === "user" ? "Generate My Summary" : "Generate Project Summary"}
            </Button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="rounded-2xl bg-card px-4 sm:px-5 py-3 space-y-3"
        style={{ border: "1px solid var(--color-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        {/* Row 1: quick date + calendar + apply */}
        <div className="flex items-center gap-2 flex-wrap">
          {QUICK_PICKS.map(({ label, key }) => {
            const active = activeQuick === key;
            return (
              <button key={key} type="button" onClick={() => applyQuick(key)}
                className="rounded-full px-4 py-2 text-sm font-semibold transition-all min-h-[36px]"
                style={active
                  ? { background: "#1264a3", color: "#fff", boxShadow: "0 2px 8px rgba(18,100,163,0.35)" }
                  : { background: "var(--pill-inactive-bg)", color: "var(--pill-inactive-color)" }}>
                {label}
              </button>
            );
          })}
          <div className="hidden sm:block w-px h-5 mx-1 shrink-0 bg-border" />
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <button type="button"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all min-h-[36px]"
                style={activeQuick === "custom"
                  ? { background: "#1264a3", color: "#fff", boxShadow: "0 2px 8px rgba(18,100,163,0.35)" }
                  : { background: "var(--cal-btn-inactive-bg)", color: "var(--cal-btn-inactive-color)", border: "1px solid var(--cal-btn-inactive-border)" }}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {fmtRange(range)}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
              <Calendar mode="range" selected={range}
                onSelect={(r) => {
                  setRange(r);
                  setActiveQuick("custom");
                  if (r?.from && r?.to && r.from.getTime() !== r.to.getTime()) setCalOpen(false);
                }}
                numberOfMonths={isMobile ? 1 : 2}
                disabled={{ after: today }}
                initialFocus className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <button type="button" onClick={() => fetchData()} disabled={loading || !range?.from}
            className="sm:ml-auto inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 min-h-[36px]"
            style={{ background: "#1264a3", color: "#fff", boxShadow: "0 2px 8px rgba(18,100,163,0.3)" }}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {loading ? "Loading…" : "Apply"}
          </button>
        </div>

        {/* Row 2: type filter + member filter */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border">
          {/* Type filter */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
            {TYPE_OPTS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleTypeChange(value)}
                className="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
                style={typeFilter === value
                  ? { background: "#1264a3", color: "#fff" }
                  : { color: "var(--muted-foreground)", background: "transparent" }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Member filter — only on user tab for team_lead / manager / admin */}
          {tab === "user" && canFilterByMember && members.length > 0 && (
            <Popover open={memberPickerOpen} onOpenChange={setMemberPickerOpen}>
              <PopoverTrigger asChild>
                <button type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  {memberIds.length === 0
                    ? "All members"
                    : memberIds.length === 1
                      ? (members.find((m) => m.user_id === memberIds[0])?.name ?? "1 member")
                      : `${memberIds.length} members`}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-1" align="start">
                <div className="max-h-56 overflow-y-auto">
                  <button type="button" onClick={handleClearMembers}
                    className={`w-full text-left px-3 py-2 rounded text-[13px] transition-colors ${memberIds.length === 0 ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}`}>
                    All members
                  </button>
                  {members.map((m) => {
                    const checked = memberIds.includes(m.user_id);
                    return (
                      <button key={m.user_id} type="button" onClick={() => handleMemberToggle(m.user_id)}
                        className={`w-full text-left px-3 py-2 rounded text-[13px] transition-colors flex items-start gap-2 ${checked ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}`}>
                        <span className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center text-[10px] ${checked ? "bg-primary border-primary text-white" : "border-muted-foreground/40"}`}>
                          {checked && "✓"}
                        </span>
                        <span className="min-w-0">
                          <div className="font-medium truncate">{m.name}</div>
                          <div className="text-[11px] text-muted-foreground capitalize">{m.project_role === "team_lead" ? "Team Lead" : "Member"}</div>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Generating indicator */}
          {isPolling && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
              <Loader2 className="h-3 w-3 animate-spin" /> Generating…
            </span>
          )}
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="rounded-2xl bg-card p-16 text-center" style={{ border: "1px solid var(--color-border)" }}>
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" style={{ color: "#1264a3" }} />
          <p className="text-muted-foreground" style={{ fontSize: "14px" }}>Loading summaries…</p>
        </div>
      ) : !hasData ? (
        <div className="rounded-2xl bg-card p-16 text-center" style={{ border: "2px dashed var(--color-border)" }}>
          <FileSearch className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-semibold mb-1 text-foreground" style={{ fontSize: "15px" }}>No summaries found</p>
          <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
            Try a different date range or filter, or generate a summary above.
          </p>
        </div>
      ) : (
        <SlackStyleFeed
          rows={rows}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      )}

      {generateOpen && (
        <GenerateProjectSummaryDialog
          open={generateOpen}
          onOpenChange={setGenerateOpen}
          projectId={projectId}
          scope={tab === "user" ? "personal" : "project"}
          onStarted={(tid) => setTaskId(tid)}
        />
      )}
    </div>
  );
}

/* ─── RenameSlugDialog ──────────────────────────────────────────────────────── */

function RenameSlugDialog({
  project,
  onOpenChange,
  onSaved,
}: {
  project: ProjectDetail;
  onOpenChange: (o: boolean) => void;
  onSaved: (newSlug: string) => void;
}) {
  const [newSlug, setNewSlug] = useState(project.id);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isUnchanged = newSlug === project.id;
  const isValid = /^[a-z][a-z0-9-]*$/.test(newSlug) && newSlug.length >= 2;

  useEffect(() => {
    if (isUnchanged || !isValid) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(
          `/projects/${project.id}/slug/check?new_slug=${encodeURIComponent(newSlug)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as { available: boolean };
          setAvailable(data.available);
        }
      } catch {
        // ignore
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [newSlug, isUnchanged, isValid, project.id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/projects/${project.id}/slug`, {
        method: "PUT",
        body: JSON.stringify({ new_slug: newSlug }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to rename slug");
        return;
      }
      toast.success("Project slug updated.");
      onSaved(newSlug);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !isUnchanged && isValid && available === true && !submitting;

  return (
    <Dialog open onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename project slug</DialogTitle>
          <DialogDescription>
            The slug is used in all project URLs. Renaming it will redirect you to the new URL.
            Lowercase letters, numbers, and hyphens only.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Current slug</Label>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-mono text-muted-foreground">
              {project.id}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-slug">New slug</Label>
            <div className="relative">
              <Input
                id="new-slug"
                value={newSlug}
                onChange={(e) => {
                  setAvailable(null);
                  setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                disabled={submitting}
                className="font-mono"
              />
              {checking && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            {!isUnchanged && !isValid && newSlug.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Must start with a letter; only lowercase letters, numbers, and hyphens.
              </p>
            )}
            {!isUnchanged && isValid && !checking && available === true && (
              <p className="text-xs text-emerald-600">✓ Slug available</p>
            )}
            {!isUnchanged && isValid && !checking && available === false && (
              <p className="text-xs text-destructive">✗ Slug already in use</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Saving…" : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
