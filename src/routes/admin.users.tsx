import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ScrollText, Trash2, Pencil, Loader2 } from "lucide-react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { RoleBadge } from "@/components/RoleBadge";
import { useCurrentUser } from "@/lib/user-store";
import { ROLE_LABEL, ROLE_OPTIONS, type Role } from "@/lib/roles";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  PaginationControls,
  type PaginatedResponse,
} from "@/components/PaginationControls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  slack_user_id?: string;
  created_at?: string;
}

export const Route = createFileRoute("/admin/users")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminUsersPage,
});

function AdminUsersPage() {
  return (
    <AppShell title="User Management">
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
          <div className="relative">
            <h1
              className="font-extrabold mb-1.5"
              style={{ fontSize: "24px", color: "var(--banner-heading-color)", letterSpacing: "-0.025em" }}
            >
              User Management
            </h1>
            <p style={{ fontSize: "14px", color: "var(--banner-subtitle-color)" }}>
              Change roles and review every user in the workspace.
            </p>
          </div>
        </div>

        <RoleGate allowed={["admin"]}>
          <Inner />
        </RoleGate>
      </div>
    </AppShell>
  );
}

function fmt(d?: string) {
  if (!d) return "—";
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return d;
  }
}

function Inner() {
  const { user: me } = useCurrentUser();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [viewSummaries, setViewSummaries] = useState<AdminUser | null>(null);
  const [renamingUser, setRenamingUser] = useState<AdminUser | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteUser = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/admin/users/${pendingDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        await handleApiError(res, "Failed to delete user");
        return;
      }
      toast.success(`${pendingDelete.name || pendingDelete.email} deleted.`);
      setPendingDelete(null);
      await fetchUsers();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    document.title = "User Management — Slack Summarizer";
  }, []);

  const fetchUsers = async (p = page, s = pageSize) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/users?page=${p}&page_size=${s}`);
      if (!res.ok) {
        await handleApiError(res, "Failed to load users");
        setUsers([]);
        return;
      }
      const data = (await res.json()) as PaginatedResponse<AdminUser>;
      const list = data.results ?? [];
      setUsers(list);
      setTotal(data.total ?? list.length);
      setTotalPages(data.total_pages ?? 1);
      setHasNext(Boolean(data.has_next));
      setHasPrevious(Boolean(data.has_previous));
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  return (
    <>
      <section
        className="rounded-2xl bg-card overflow-hidden border border-border"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-border">
          <h2 className="font-semibold text-foreground" style={{ fontSize: "13.5px" }}>
            {total > 0 ? `${total} user${total === 1 ? "" : "s"}` : "Users"}
          </h2>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !users || users.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No users found.</div>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-border">
              {users.map((u) => {
                const isMe = me?.id === u.id;
                return (
                  <li key={u.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {u.name || "Unnamed"} {isMe && <span className="text-xs text-muted-foreground font-normal">(you)</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                      <RoleBadge role={u.role} size="xs" />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>
                        Slack:{" "}
                        <span className="font-mono text-foreground">
                          {u.slack_user_id || "—"}
                        </span>
                      </div>
                      <div>Joined {fmt(u.created_at)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setViewSummaries(u)}
                        className="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center gap-1.5"
                      >
                        <ScrollText className="h-3.5 w-3.5" />
                        Summaries
                      </button>
                      <button
                        onClick={() => setRenamingUser(u)}
                        className="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Rename
                      </button>
                      <button
                        onClick={() => setEditing(u)}
                        disabled={isMe}
                        className="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isMe ? "—" : "Change Role"}
                      </button>
                      <button
                        onClick={() => setPendingDelete(u)}
                        disabled={isMe}
                        className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Slack ID</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isMe = me?.id === u.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="px-6 text-sm font-medium text-foreground">
                          {u.name || "Unnamed"}
                          {isMe && (
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              (you)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={u.role} size="xs" />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono max-w-[140px] truncate">
                          {u.slack_user_id || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmt(u.created_at)}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setViewSummaries(u)}
                              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
                            >
                              <ScrollText className="h-3.5 w-3.5" />
                              Summaries
                            </button>
                            <button
                              onClick={() => setRenamingUser(u)}
                              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Rename
                            </button>
                            <button
                              onClick={() => setEditing(u)}
                              disabled={isMe}
                              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Change Role
                            </button>
                            <button
                              onClick={() => setPendingDelete(u)}
                              disabled={isMe}
                              className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Delete user"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

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
          </>
        )}
      </section>

      {editing && (
        <ChangeRoleDialog
          user={editing}
          onOpenChange={(o) => { if (!o) setEditing(null); }}
          onSaved={() => fetchUsers()}
        />
      )}

      {viewSummaries && (
        <UserSummariesDialog
          user={viewSummaries}
          onOpenChange={(o) => { if (!o) setViewSummaries(null); }}
        />
      )}

      {renamingUser && (
        <RenameUsernameDialog
          user={renamingUser}
          onOpenChange={(o) => { if (!o) setRenamingUser(null); }}
          onSaved={() => { setRenamingUser(null); fetchUsers(); }}
        />
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => { if (!o && !deleting) setPendingDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name || pendingDelete?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the user and remove all their project memberships. This action cannot be undone from the UI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteUser(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface ProjectMembership {
  project_id: string;
  project_name: string;
  project_role: "employee" | "team_lead";
}

function ChangeRoleDialog({
  user,
  onOpenChange,
  onSaved,
}: {
  user: AdminUser;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<Role>(
    // team_lead is project-scoped now — fall back to employee in the picker
    user.role === "team_lead" ? "employee" : user.role,
  );
  const [submitting, setSubmitting] = useState(false);
  const [memberships, setMemberships] = useState<ProjectMembership[] | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/admin/users/${user.id}`);
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { projects?: ProjectMembership[] };
          setMemberships(data.projects ?? []);
        }
      } catch {
        if (!cancelled) setMemberships([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/admin/users/${user.id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to update role");
        return;
      }
      toast.success(`Role updated to ${ROLE_LABEL[role]}`);
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
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            Update the workspace role for{" "}
            <span className="font-medium text-foreground">
              {user.name || user.email}
            </span>
            . Team-lead is now a project-scoped role and is managed from each
            project's Members tab.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">
              Workspace role
            </label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">
              Project memberships
            </label>
            {memberships === null ? (
              <div className="text-xs text-muted-foreground">Loading…</div>
            ) : memberships.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">
                No project memberships.
              </div>
            ) : (
              <ul className="rounded-md border border-border divide-y divide-border max-h-40 overflow-y-auto">
                {memberships.map((m) => (
                  <li
                    key={m.project_id}
                    className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-medium text-foreground truncate">
                      {m.project_name}
                    </span>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {m.project_role === "team_lead" ? "Team Lead" : "Member"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || role === user.role}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Types mirrored from hierarchy API ───────────────────────────────────────
// ─── RenameUsernameDialog ────────────────────────────────────────────────────

function RenameUsernameDialog({
  user,
  onOpenChange,
  onSaved,
}: {
  user: AdminUser;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [newUsername, setNewUsername] = useState(user.id);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isUnchanged = newUsername === user.id;
  const isValid = /^[a-z][a-z0-9-]*$/.test(newUsername) && newUsername.length >= 2;

  useEffect(() => {
    if (isUnchanged || !isValid) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(
          `/admin/users/${user.id}/username/check?new_username=${encodeURIComponent(newUsername)}`,
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
  }, [newUsername, isUnchanged, isValid, user.id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/admin/users/${user.id}/username`, {
        method: "PUT",
        body: JSON.stringify({ new_username: newUsername }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to rename user");
        return;
      }
      toast.success("Username updated.");
      onSaved();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !isUnchanged && isValid && available === true && !submitting;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename username</DialogTitle>
          <DialogDescription>
            Change the login username for{" "}
            <span className="font-medium text-foreground">{user.name || user.email}</span>.
            Lowercase letters, numbers, and hyphens only.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted-foreground">Current username</label>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-mono text-muted-foreground">
              {user.id}
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-uname" className="block text-xs font-medium text-muted-foreground">
              New username
            </label>
            <div className="relative">
              <input
                id="new-uname"
                value={newUsername}
                onChange={(e) => {
                  setAvailable(null);
                  setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                disabled={submitting}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              />
              {checking && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            {!isUnchanged && !isValid && newUsername.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Must start with a letter; only lowercase letters, numbers, and hyphens allowed.
              </p>
            )}
            {!isUnchanged && isValid && !checking && available === true && (
              <p className="text-xs text-emerald-600">✓ Username available</p>
            )}
            {!isUnchanged && isValid && !checking && available === false && (
              <p className="text-xs text-destructive">✗ Username already taken</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Rename"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── UserSummariesDialog ──────────────────────────────────────────────────────

interface UserPersonalSummary {
  id: string;
  summary_text: string;
  message_count: number;
  is_auto_generated?: boolean;
  created_at: string;
  from_date?: string;
  to_date?: string;
  project_id?: string;
  project_name?: string;
}

interface UserSummariesResponse {
  total?: number;
  summaries?: UserPersonalSummary[];
  // some backends return grouped_by_date
  grouped_by_date?: Record<string, UserPersonalSummary[]>;
}

const MD_INLINE =
  "text-[13.5px] leading-relaxed text-foreground " +
  "[&_p]:mt-1 [&_strong]:font-semibold [&_em]:italic " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_a]:text-primary [&_a]:underline";

function UserSummariesDialog({
  user,
  onOpenChange,
}: {
  user: AdminUser;
  onOpenChange: (o: boolean) => void;
}) {
  const [summaries, setSummaries] = useState<UserPersonalSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserPersonalSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/summaries/user/${user.id}`);
        if (!res.ok) {
          await handleApiError(res, "Failed to load summaries");
          if (!cancelled) setSummaries([]);
          return;
        }
        const data = (await res.json()) as UserSummariesResponse;
        if (cancelled) return;
        if (Array.isArray(data.summaries)) {
          setSummaries(data.summaries);
        } else if (data.grouped_by_date) {
          const flat = Object.values(data.grouped_by_date).flat();
          flat.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setSummaries(flat);
        } else {
          setSummaries([]);
        }
      } catch {
        if (!cancelled) {
          toast.error("Network error loading summaries.");
          setSummaries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  const handleDelete = async (s: UserPersonalSummary) => {
    if (!s.project_id) return;
    setDeletingId(s.id);
    try {
      const res = await apiFetch(`/summaries/projects/${s.project_id}/personal/${s.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to delete summary");
        return;
      }
      toast.success("Summary deleted");
      setSummaries((prev) => (prev ? prev.filter((x) => x.id !== s.id) : prev));
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const displayName = user.name || user.email;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            {displayName}'s Summaries
          </DialogTitle>
          <DialogDescription>
            All personal summaries generated by this user across all projects.
          </DialogDescription>
        </DialogHeader>

        <AlertDialog
          open={confirmDelete !== null}
          onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this summary?</AlertDialogTitle>
              <AlertDialogDescription>
                This personal summary will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  if (confirmDelete) handleDelete(confirmDelete);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
          {loading ? (
            <div className="space-y-3 py-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !summaries || summaries.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="text-2xl">📄</div>
              <p className="text-sm font-medium text-foreground">No summaries yet</p>
              <p className="text-xs text-muted-foreground">
                {displayName} hasn't generated any personal summaries.
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {summaries.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(s.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                    {s.project_name && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground font-medium">
                        {s.project_name}
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        s.is_auto_generated
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400"
                      }`}
                    >
                      {s.is_auto_generated ? "Auto" : "Manual"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.message_count} messages
                    </span>
                    {s.project_id && (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(s)}
                        disabled={deletingId === s.id}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded"
                        title="Delete summary"
                        aria-label="Delete summary"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className={MD_INLINE}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {s.summary_text}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
