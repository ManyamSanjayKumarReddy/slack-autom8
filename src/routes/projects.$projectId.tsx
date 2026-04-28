import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
        hasPersonalSummaries={hasPersonalSummaries}
        canGenerateProjectSummary={canGenerateProjectSummary}
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
  hasPersonalSummaries,
  canGenerateProjectSummary,
  onEdit,
  onDelete,
}: {
  project: ProjectDetail;
  projectId: string;
  isAdmin: boolean;
  canManage: boolean;
  fetchProject: () => void;
  hasPersonalSummaries: boolean;
  canGenerateProjectSummary: boolean;
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
      <div className="flex items-center border-b border-slate-200 bg-transparent px-0 -mx-5 sm:-mx-8 overflow-x-auto">
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
                  : "border-transparent text-slate-500 hover:text-slate-700")
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
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <ChannelsTab projectId={projectId} canManage={canManage} onChanged={fetchProject} />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <MembersTab projectId={projectId} canManage={canManage} onChanged={fetchProject} />
            </div>
          </div>
        </>
      )}

      {activeTab === "summaries" && (
        <SummariesSection
          projectId={projectId}
          hasPersonalSummaries={hasPersonalSummaries}
          canGenerateProjectSummary={canGenerateProjectSummary}
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

  return (
    <div className="pt-5 pb-2">
      {/* Project header card — description + contextual actions + stats */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        {/* Description row with inline icon-only action buttons */}
        <div className="flex items-start gap-3 px-6 pt-6 pb-5">
          <div className="flex-1 min-w-0">
            {project.description ? (
              <p className="text-[15px] text-slate-600 leading-relaxed">{project.description}</p>
            ) : (
              <p className="text-[14px] italic text-slate-400">No description provided.</p>
            )}
          </div>
          {canManage && (
            <div className="flex items-center gap-0.5 shrink-0 -mt-0.5">
              <button
                onClick={onEdit}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Edit project"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {isAdmin && (
                <button
                  onClick={onDelete}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Delete project"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 mx-6" />

        {/* Stat pills grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6">
          <div className="rounded-xl bg-slate-50/80 border border-slate-100 px-4 py-3.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Manager</div>
            <div className="flex flex-col gap-1">
              <span className={`text-sm font-semibold leading-snug ${project.manager_name ? "text-slate-800" : "italic text-slate-400"}`}>
                {project.manager_name || "Unassigned"}
              </span>
              {isAdmin && (
                <button
                  onClick={() => setAssigning(true)}
                  className="text-[11px] text-indigo-500 hover:text-indigo-700 transition-colors font-medium text-left w-fit"
                >
                  {project.manager_id ? "change" : "assign"}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50/80 border border-slate-100 px-4 py-3.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Members</div>
            <div className="text-2xl font-bold text-slate-800 leading-none">{project.member_count ?? 0}</div>
          </div>

          <div className="rounded-xl bg-slate-50/80 border border-slate-100 px-4 py-3.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Channels</div>
            <div className="text-2xl font-bold text-slate-800 leading-none">{project.channel_count ?? 0}</div>
          </div>

          {project.created_at && (
            <div className="rounded-xl bg-slate-50/80 border border-slate-100 px-4 py-3.5">
              <div className="text-[10.5px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Created</div>
              <div className="text-sm font-semibold text-slate-800">{new Date(project.created_at).toLocaleDateString()}</div>
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
    <div>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Hash className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 leading-none">Channels</h2>
            {channels !== null && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {channels.length} {channels.length === 1 ? "channel" : "channels"}
              </p>
            )}
          </div>
        </div>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
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
        <ul className="divide-y divide-slate-50">
          {channels.map((c) => (
            <li
              key={c.channel_id}
              className="flex items-center justify-between gap-3 py-3.5 px-5 hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 font-semibold text-sm">
                  #
                </span>
                <div className="min-w-0">
                  <span className="text-[14px] font-semibold text-slate-800 truncate block">
                    {c.channel_name}
                  </span>
                  {c.added_at && (
                    <span className="text-[11px] text-slate-400">
                      added {new Date(c.added_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => handleRemove(c.channel_id)}
                  disabled={removingId === c.channel_id}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                  title="Remove channel"
                >
                  {removingId === c.channel_id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
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
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";
  const palettes: [string, string][] = [
    ["#ede9fe", "#7c3aed"],
    ["#dbeafe", "#1d4ed8"],
    ["#dcfce7", "#15803d"],
    ["#fef9c3", "#a16207"],
    ["#fce7f3", "#be185d"],
    ["#e0f2fe", "#0369a1"],
  ];
  const [bg, color] = palettes[name.charCodeAt(0) % palettes.length];
  return (
    <span
      className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ background: bg, color }}
    >
      {initials}
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
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
            <UsersIcon className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 leading-none">Members</h2>
            {members !== null && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {members.length} {members.length === 1 ? "member" : "members"}
              </p>
            )}
          </div>
        </div>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
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
        <ul className="divide-y divide-slate-50">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center gap-3 py-3.5 px-5 hover:bg-slate-50/60 transition-colors"
            >
              <MemberAvatar name={m.name} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-slate-800 truncate leading-snug">{m.name}</div>
                <div className="text-[12px] text-slate-400 mt-0.5 truncate">{m.email}</div>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 text-[11px] font-semibold ${
                  m.project_role === "team_lead"
                    ? "border-indigo-200 text-indigo-700 bg-indigo-50"
                    : "border-slate-200 text-slate-600 bg-slate-50"
                }`}
              >
                {m.project_role === "team_lead" ? "Team Lead" : "Employee"}
              </Badge>
              {canManage && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => setEditingMember(m)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    title="Edit role"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setConfirmRemove(m)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
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

/* ----- Hierarchy types & helpers (mirrored from hierarchy.$projectId.tsx) ----- */
interface PersonalSummary {
  id: string;
  summary_text: string;
  message_count: number;
  is_auto_generated?: boolean;
  created_at: string;
}
interface HierarchyMember {
  user_id: string;
  user_name: string;
  project_role: "employee" | "team_lead";
  personal_summaries: PersonalSummary[];
}
interface HierarchyDate {
  project_summaries: PersonalSummary[];
  members: HierarchyMember[];
}
interface HierarchyProject {
  project_id: string;
  project_name: string;
  dates: Record<string, HierarchyDate>;
}
interface HierarchyResponse {
  projects: HierarchyProject[];
}

function flattenProject(project: HierarchyProject): FeedRow[] {
  const rows: FeedRow[] = [];
  for (const [date, d] of Object.entries(project.dates)) {
    for (const s of d.project_summaries) {
      rows.push({ ...s, date, type: "project", rowKey: `project-${date}-${s.id}` });
    }
    for (const m of d.members) {
      for (const s of m.personal_summaries) {
        rows.push({
          ...s,
          date,
          type: "personal",
          member_name: m.user_name,
          member_role: m.project_role,
          rowKey: `personal-${m.user_id}-${date}-${s.id}`,
        });
      }
    }
  }
  return rows.sort((a, b) => {
    if (a.date !== b.date) return a.date > b.date ? -1 : 1;
    if (a.type !== b.type) return a.type === "project" ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function formatRange(r: DateRange | undefined): string {
  if (!r?.from) return "Pick dates";
  if (!r.to || r.from.toDateString() === r.to.toDateString())
    return format(r.from, "MMM d, yyyy");
  return `${format(r.from, "MMM d")} – ${format(r.to, "MMM d, yyyy")}`;
}

type QuickKey = "today" | "yesterday" | "last7" | "last30" | "custom";

function SummariesSection({
  projectId,
  hasPersonalSummaries,
  canGenerateProjectSummary,
}: {
  projectId: string;
  hasPersonalSummaries: boolean;
  canGenerateProjectSummary: boolean;
}) {
  const { user } = useCurrentUser();
  const isEmployee = user?.role === "employee";
  const isMobile = useIsMobile();

  // Default scope: personal if user has it, otherwise project.
  const initialScope: "personal" | "project" = hasPersonalSummaries
    ? "personal"
    : "project";
  const [scope, setScope] = useState<"personal" | "project">(initialScope);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [polling, setPolling] = useState(false);

  // If a user can't access the current scope, snap to the allowed one.
  useEffect(() => {
    if (scope === "personal" && !hasPersonalSummaries) setScope("project");
    if (scope === "project" && !canGenerateProjectSummary && hasPersonalSummaries) {
      setScope("personal");
    }
  }, [scope, hasPersonalSummaries, canGenerateProjectSummary]);

  const showTabs = hasPersonalSummaries && canGenerateProjectSummary;
  const canGenerateCurrent =
    scope === "personal" ? hasPersonalSummaries : canGenerateProjectSummary;

  // Date-filtered feed (mirrors hierarchy.$projectId.tsx)
  const today = new Date();
  const [range, setRange] = useState<DateRange | undefined>({ from: today, to: today });
  const [activeQuick, setActiveQuick] = useState<QuickKey>("today");
  const [calOpen, setCalOpen] = useState(false);
  const [project, setProject] = useState<HierarchyProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchData = async (r?: DateRange) => {
    const active = r ?? range;
    setLoading(true);
    setNotFound(false);
    try {
      const params = new URLSearchParams();
      if (active?.from) params.set("from_date", format(active.from, "yyyy-MM-dd"));
      if (active?.to) params.set("to_date", format(active.to, "yyyy-MM-dd"));

      if (isEmployee) {
        const [sumRes, projRes] = await Promise.all([
          apiFetch(`/summaries/projects/${projectId}/personal?${params.toString()}`),
          apiFetch(`/projects/${projectId}`),
        ]);
        if (!sumRes.ok) {
          setProject(null);
          setNotFound(true);
          return;
        }
        const sumData = (await sumRes.json()) as {
          project_id: string;
          grouped_by_date: Record<string, PersonalSummary[]>;
        };
        let projectName = "Project";
        if (projRes.ok) {
          try {
            const p = (await projRes.json()) as { name?: string };
            if (p?.name) projectName = p.name;
          } catch {
            // ignore
          }
        }
        const memberName = user?.name || user?.email || "You";
        const memberId = user?.id || "me";
        const dates: Record<string, HierarchyDate> = {};
        for (const [date, items] of Object.entries(sumData.grouped_by_date ?? {})) {
          dates[date] = {
            project_summaries: [],
            members: [
              {
                user_id: memberId,
                user_name: memberName,
                project_role: "employee",
                personal_summaries: items,
              },
            ],
          };
        }
        const adapted: HierarchyProject = {
          project_id: projectId,
          project_name: projectName,
          dates,
        };
        setProject(adapted);
        if (Object.keys(dates).length === 0) setNotFound(true);
        return;
      }

      const res = await apiFetch(`/summaries/hierarchy?${params.toString()}`);
      if (!res.ok) {
        setProject(null);
        setNotFound(true);
        return;
      }
      const data = (await res.json()) as HierarchyResponse;
      const found = data.projects.find((p) => p.project_id === projectId) ?? null;
      setProject(found);
      if (!found) setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const applyQuick = (key: QuickKey) => {
    setActiveQuick(key);
    const end = new Date();
    let r: DateRange;
    if (key === "today") {
      r = { from: new Date(), to: new Date() };
    } else if (key === "yesterday") {
      const y = new Date(); y.setDate(y.getDate() - 1);
      r = { from: y, to: y };
    } else if (key === "last7") {
      const s = new Date(); s.setDate(s.getDate() - 6);
      r = { from: s, to: end };
    } else {
      const s = new Date(); s.setDate(s.getDate() - 29);
      r = { from: s, to: end };
    }
    setRange(r);
    fetchData(r);
  };

  // Initial + on user/projectId change
  useEffect(() => {
    if (user) fetchData({ from: today, to: today });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user?.role]);

  const allRows = project ? flattenProject(project) : [];
  // Filter rows by current scope: personal vs project
  const rows = allRows.filter((r) => r.type === scope);

  const QUICK_PICKS: { label: string; key: QuickKey }[] = [
    { label: "Today", key: "today" },
    { label: "Yesterday", key: "yesterday" },
    { label: "Last 7 days", key: "last7" },
    { label: "Last 30 days", key: "last30" },
  ];

  return (
    <div className="space-y-4">
      {/* Header: scope toggle + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap py-3">
        <div className="flex items-center gap-2">
          {showTabs ? (
            <Tabs value={scope} onValueChange={(v) => setScope(v as "personal" | "project")}>
              <TabsList>
                <TabsTrigger value="personal">My Summaries</TabsTrigger>
                <TabsTrigger value="project">Project Summaries</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <h3 className="text-base font-semibold text-slate-800">
              {scope === "personal" ? "My Summaries" : "Project Summaries"}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm">
            <Link to="/hierarchy/$projectId" params={{ projectId }}>
              View all
            </Link>
          </Button>
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
      </div>

      {/* Date filter bar */}
      <div
        className="rounded-2xl bg-white px-4 sm:px-5 py-3 sm:py-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-2 sm:flex-wrap"
        style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {QUICK_PICKS.map(({ label, key }) => {
            const active = activeQuick === key;
            return (
              <button key={key} type="button" onClick={() => applyQuick(key)}
                className="rounded-full px-4 py-2 text-sm font-semibold transition-all min-h-[36px]"
                style={active
                  ? { background: "#6366f1", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }
                  : { background: "#f1f5f9", color: "#475569" }}>
                {label}
              </button>
            );
          })}

          <div className="hidden sm:block w-px h-5 mx-1 shrink-0" style={{ background: "#e2e8f0" }} />

          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <button type="button"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all min-h-[36px]"
                style={activeQuick === "custom"
                  ? { background: "#6366f1", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.35)" }
                  : { background: "#eef2ff", color: "#4338ca", border: "1px solid #e0e7ff" }}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {formatRange(range)}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
              <Calendar
                mode="range"
                selected={range}
                onSelect={(r) => {
                  setRange(r);
                  setActiveQuick("custom");
                  if (r?.from && r?.to) setCalOpen(false);
                }}
                numberOfMonths={isMobile ? 1 : 2}
                disabled={{ after: today }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <button type="button" onClick={() => fetchData()} disabled={loading || !range?.from}
          className="sm:ml-auto w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 min-h-[36px]"
          style={{ background: "#6366f1", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {loading ? "Loading…" : "Apply"}
        </button>
      </div>

      {/* Feed */}
      {loading && !project ? (
        <div className="rounded-2xl bg-white p-16 text-center" style={{ border: "1px solid #e2e8f0" }}>
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" style={{ color: "#6366f1" }} />
          <p style={{ fontSize: "14px", color: "#64748b" }}>Loading summaries…</p>
        </div>
      ) : notFound || !project || rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-16 text-center" style={{ border: "2px dashed #e2e8f0" }}>
          <FileSearch className="h-10 w-10 mx-auto mb-3" style={{ color: "#cbd5e1" }} />
          <p className="font-semibold mb-1" style={{ fontSize: "15px", color: "#334155" }}>
            No summaries found
          </p>
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>
            Try a different date range, or generate a summary above.
          </p>
        </div>
      ) : (
        <SlackStyleFeed rows={rows} />
      )}

      {generateOpen && (
        <GenerateProjectSummaryDialog
          open={generateOpen}
          onOpenChange={setGenerateOpen}
          projectId={projectId}
          scope={scope}
          onStarted={() => {
            setPolling(true);
            // Re-fetch shortly after to pick up new summary
            setTimeout(() => {
              fetchData();
              setPolling(false);
            }, 1500);
          }}
        />
      )}
    </div>
  );
}
