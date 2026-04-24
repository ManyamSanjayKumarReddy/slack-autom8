import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, Users as UsersIcon, Plus, X, UserCog } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { RoleBadge } from "@/components/RoleBadge";
import { useCurrentUser } from "@/lib/user-store";
import { invalidateTeamsCache } from "@/lib/teams-store";
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
import { Skeleton } from "@/components/ui/skeleton";
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
import type { Role } from "@/lib/roles";

interface Team {
  id: string;
  name: string;
  description?: string;
  member_count?: number;
  members_count?: number;
  manager_id?: string | null;
  manager_name?: string | null;
  team_lead_id?: string | null;
  team_lead_name?: string | null;
  created_at?: string;
}

interface Member {
  user_id: string;
  name: string;
  email: string;
  role: Role;
  joined_at?: string;
}

export const Route = createFileRoute("/teams")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: TeamsPage,
});

function TeamsPage() {
  return (
    <AppShell title="Teams Management" subtitle="Create teams and manage their members.">
      <RoleGate allowed={["manager", "admin"]}>
        <Inner />
      </RoleGate>
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
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";

  const [teams, setTeams] = useState<Team[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const [editing, setEditing] = useState<Team | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Team | null>(null);
  const [membersOf, setMembersOf] = useState<Team | null>(null);
  const [managingRoles, setManagingRoles] = useState<Team | null>(null);

  useEffect(() => {
    document.title = "Teams Management — Slack Summarizer";
  }, []);

  const fetchTeams = async (p = page, s = pageSize) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/teams/?page=${p}&page_size=${s}`);
      if (!res.ok) {
        await handleApiError(res, "Failed to load teams");
        setTeams([]);
        return;
      }
      const data = (await res.json()) as PaginatedResponse<Team>;
      const list = data.results ?? [];
      setTeams(list);
      setTotal(data.total ?? list.length);
      setTotalPages(data.total_pages ?? 1);
      setHasNext(Boolean(data.has_next));
      setHasPrevious(Boolean(data.has_previous));
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const handleSaved = () => {
    invalidateTeamsCache();
    fetchTeams();
  };

  const handleDelete = async (team: Team) => {
    try {
      const res = await apiFetch(`/teams/${team.id}`, { method: "DELETE" });
      if (!res.ok) {
        await handleApiError(res, "Failed to delete team");
        return;
      }
      toast.success("Team deleted");
      invalidateTeamsCache();
      fetchTeams();
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-foreground">
            {total > 0 ? `${total} team${total === 1 ? "" : "s"}` : "Teams"}
          </h2>
          {isAdmin && (
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 sm:px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Team</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !teams || teams.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {isAdmin ? "No teams yet. Click \"Add Team\" to create one." : "No teams assigned to you yet."}
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-border">
              {teams.map((t) => (
                <li key={t.id} className="p-4 space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t.name}</div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {t.description}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground">
                        {t.member_count ?? t.members_count ?? 0}
                      </span>{" "}
                      members
                    </span>
                    <span>
                      Manager:{" "}
                      <span className={t.manager_name ? "text-foreground font-medium" : "italic"}>
                        {t.manager_name || "Unassigned"}
                      </span>
                    </span>
                    <span>{fmt(t.created_at)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setMembersOf(t)}
                      className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                    >
                      <UsersIcon className="h-3.5 w-3.5" /> Members
                    </button>
                    <button
                      onClick={() => setManagingRoles(t)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                    >
                      <UserCog className="h-3.5 w-3.5" /> Manage Roles
                    </button>
                    <button
                      onClick={() => setEditing(t)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(t)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6">Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Team Lead</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="px-6 text-sm font-medium text-foreground">
                        {t.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[260px] truncate">
                        {t.description || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.manager_name ? (
                          <span className="text-foreground">{t.manager_name}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.team_lead_name ? (
                          <span className="text-foreground">{t.team_lead_name}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {t.member_count ?? t.members_count ?? 0}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmt(t.created_at)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => setMembersOf(t)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                          >
                            <UsersIcon className="h-3.5 w-3.5" /> Members
                          </button>
                          <button
                            onClick={() => setManagingRoles(t)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                          >
                            <UserCog className="h-3.5 w-3.5" /> Manage Roles
                          </button>
                          <button
                            onClick={() => setEditing(t)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => setConfirmDelete(t)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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

      {(creating || editing) && (
        <TeamFormDialog
          team={editing}
          open
          onOpenChange={(o) => {
            if (!o) {
              setCreating(false);
              setEditing(null);
            }
          }}
          onSaved={handleSaved}
        />
      )}

      {membersOf && (
        <MembersDialog
          team={membersOf}
          onOpenChange={(o) => {
            if (!o) setMembersOf(null);
          }}
          onChanged={() => {
            invalidateTeamsCache();
          }}
        />
      )}

      {assigningManager && (
        <AssignManagerDialog
          team={assigningManager}
          onOpenChange={(o) => {
            if (!o) setAssigningManager(null);
          }}
          onSaved={(updated) => {
            invalidateTeamsCache();
            if (updated) {
              setTeams((prev) =>
                prev
                  ? prev.map((t) =>
                      t.id === updated.id ? { ...t, ...updated } : t,
                    )
                  : prev,
              );
            }
            fetchTeams();
          }}
        />
      )}

      {assigningTeamLead && (
        <AssignTeamLeadDialog
          team={assigningTeamLead}
          onOpenChange={(o) => {
            if (!o) setAssigningTeamLead(null);
          }}
          onSaved={(updated) => {
            invalidateTeamsCache();
            if (updated) {
              setTeams((prev) =>
                prev
                  ? prev.map((t) =>
                      t.id === updated.id ? { ...t, ...updated } : t,
                    )
                  : prev,
              );
            }
            fetchTeams();
          }}
        />
      )}

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this team?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete
                ? `"${confirmDelete.name}" will be permanently deleted. This cannot be undone.`
                : ""}
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
    </>
  );
}

function TeamFormDialog({
  team,
  open,
  onOpenChange,
  onSaved,
}: {
  team: Team | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const url = team ? `/teams/${team.id}` : `/teams/`;
      const method = team ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (!res.ok) {
        await handleApiError(res, team ? "Failed to update team" : "Failed to create team");
        return;
      }
      toast.success(team ? "Team updated" : "Team created");
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
          <DialogTitle>{team ? "Edit team" : "Create team"}</DialogTitle>
          <DialogDescription>
            {team ? "Update team details." : "Give your new team a name and short description."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Engineering"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does this team do?"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving…" : team ? "Save changes" : "Create team"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MembersDialog({
  team,
  onOpenChange,
  onChanged,
}: {
  team: Team;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; email: string; role?: Role }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = async (p = page, s = pageSize) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/teams/${team.id}/members?page=${p}&page_size=${s}`);
      if (!res.ok) {
        await handleApiError(res, "Failed to load members");
        setMembers([]);
        return;
      }
      const data = (await res.json()) as PaginatedResponse<Member>;
      const list = data.results ?? [];
      setMembers(list);
      setTotalPages(data.total_pages ?? 1);
      setHasNext(Boolean(data.has_next));
      setHasPrevious(Boolean(data.has_previous));
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, team.id]);

  // Debounced user search
  useEffect(() => {
    if (!adding) return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`/admin/users/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setSearchResults([]);
          return;
        }
        const data = (await res.json()) as { results?: { id: string; name: string; email: string; role?: Role }[] };
        setSearchResults(data.results ?? []);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, adding]);

  const resetAdd = () => {
    setAdding(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setShowResults(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      toast.error("Please select a user from the search results");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(`/teams/${team.id}/members`, {
        method: "POST",
        body: JSON.stringify({ user_id: selectedUser.id }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to add member");
        return;
      }
      toast.success("Member added");
      resetAdd();
      onChanged();
      fetchMembers(1, pageSize);
      setPage(1);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (m: Member) => {
    try {
      const res = await apiFetch(`/teams/${team.id}/members/${m.user_id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to remove member");
        return;
      }
      toast.success("Member removed");
      onChanged();
      fetchMembers();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{team.name} — Members</DialogTitle>
          <DialogDescription>Manage who belongs to this team.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Member
            </button>
          ) : (
            <form onSubmit={handleAdd} className="flex w-full gap-2 items-start">
              <div className="flex-1 relative">
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedUser(null);
                    setShowResults(true);
                  }}
                  onFocus={() => setShowResults(true)}
                  placeholder="Search by name or email…"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {selectedUser && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Selected:{" "}
                    <span className="text-foreground font-medium">{selectedUser.name}</span>{" "}
                    <span>({selectedUser.email})</span>
                  </div>
                )}
                {showResults && searchQuery.trim() && !selectedUser && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                    {searching ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No users found.</div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {searchResults.map((u) => (
                          <li key={u.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser({ id: u.id, name: u.name, email: u.email });
                                setSearchQuery(u.name);
                                setShowResults(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors"
                            >
                              <div className="text-sm font-medium text-foreground truncate">
                                {u.name || "Unnamed"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {u.email}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={submitting || !selectedUser}
                className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
              >
                {submitting ? "Adding…" : "Add"}
              </button>
              <button
                type="button"
                onClick={resetAdd}
                className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !members || members.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No members yet.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((m) => (
                <li
                  key={m.user_id}
                  className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {m.name || "Unnamed"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                      Joined {fmt(m.joined_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <RoleBadge role={m.role} size="xs" />
                    <button
                      onClick={() => handleRemove(m)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {members && members.length > 0 && (
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssignManagerDialog({
  team,
  onOpenChange,
  onSaved,
}: {
  team: Team;
  onOpenChange: (o: boolean) => void;
  onSaved: (updated?: Partial<Team> & { id: string }) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; email: string; role?: Role }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">(team.manager_id ? "view" : "edit");

  // Debounced search filtered to managers only
  useEffect(() => {
    if (mode !== "edit") return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(
          `/admin/users/search?q=${encodeURIComponent(q)}&role=manager`,
        );
        if (!res.ok) {
          setSearchResults([]);
          return;
        }
        const data = (await res.json()) as {
          results?: { id: string; name: string; email: string; role?: Role }[];
        };
        const all = data.results ?? [];
        setSearchResults(all.filter((u) => !u.role || u.role === "manager"));
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error("Please select a manager from the search results");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(`/teams/${team.id}/manager`, {
        method: "PUT",
        body: JSON.stringify({ manager_id: selectedUser.id }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to assign manager");
        return;
      }
      let updated: { manager_id?: string; manager_name?: string } = {
        manager_id: selectedUser.id,
        manager_name: selectedUser.name,
      };
      try {
        const data = (await res.json()) as {
          manager_id?: string;
          manager_name?: string;
        };
        if (data && (data.manager_id || data.manager_name)) {
          updated = { ...updated, ...data };
        }
      } catch {
        // keep optimistic values
      }
      toast.success(`Manager assigned: ${updated.manager_name ?? selectedUser.name}`);
      onSaved({ id: team.id, ...updated });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    setUnassigning(true);
    try {
      const res = await apiFetch(`/teams/${team.id}/manager`, {
        method: "DELETE",
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to unassign manager");
        return;
      }
      toast.success("Manager unassigned");
      onSaved({ id: team.id, manager_id: null, manager_name: null });
      onOpenChange(false);
    } finally {
      setUnassigning(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage manager</DialogTitle>
          <DialogDescription>
            {team.manager_name ? (
              <>
                Current manager for{" "}
                <span className="font-medium text-foreground">{team.name}</span>:{" "}
                <span className="text-foreground font-medium">{team.manager_name}</span>.
              </>
            ) : (
              <>
                No manager assigned to{" "}
                <span className="font-medium text-foreground">{team.name}</span> yet.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && team.manager_id ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Assigned manager
              </div>
              <div className="text-sm font-semibold text-foreground">
                {team.manager_name || "Unknown"}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Change manager
              </button>
              <button
                type="button"
                onClick={handleUnassign}
                disabled={unassigning}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />{" "}
                {unassigning ? "Removing…" : "Unassign"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-muted-foreground">
              Search manager
            </label>
            <div className="relative">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedUser(null);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                placeholder="Search managers by name or email…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {selectedUser && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Selected:{" "}
                  <span className="text-foreground font-medium">{selectedUser.name}</span>{" "}
                  <span>({selectedUser.email})</span>
                </div>
              )}
              {showResults && searchQuery.trim() && !selectedUser && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                  {searching ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No managers found.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {searchResults.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser({ id: u.id, name: u.name, email: u.email });
                              setSearchQuery(u.name);
                              setShowResults(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors"
                          >
                            <div className="text-sm font-medium text-foreground truncate">
                              {u.name || "Unnamed"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {mode === "edit" && team.manager_id && (
            <button
              onClick={() => setMode("view")}
              className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors mr-auto"
            >
              Back
            </button>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            Close
          </button>
          {mode === "edit" && (
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedUser}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving…" : team.manager_id ? "Save" : "Assign"}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignTeamLeadDialog({
  team,
  onOpenChange,
  onSaved,
}: {
  team: Team;
  onOpenChange: (o: boolean) => void;
  onSaved: (updated?: Partial<Team> & { id: string }) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; email: string; role?: Role }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">(team.team_lead_id ? "view" : "edit");

  useEffect(() => {
    if (mode !== "edit") return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(
          `/admin/users/search?q=${encodeURIComponent(q)}&role=team_lead`,
        );
        if (!res.ok) {
          setSearchResults([]);
          return;
        }
        const data = (await res.json()) as {
          results?: { id: string; name: string; email: string; role?: Role }[];
        };
        const all = data.results ?? [];
        setSearchResults(all.filter((u) => !u.role || u.role === "team_lead"));
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error("Please select a team lead from the search results");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(`/teams/${team.id}/team-lead`, {
        method: "PUT",
        body: JSON.stringify({ user_id: selectedUser.id }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to assign team lead");
        return;
      }
      let updated: { team_lead_id?: string; team_lead_name?: string } = {
        team_lead_id: selectedUser.id,
        team_lead_name: selectedUser.name,
      };
      try {
        const data = (await res.json()) as {
          team_lead_id?: string;
          team_lead_name?: string;
        };
        if (data && (data.team_lead_id || data.team_lead_name)) {
          updated = { ...updated, ...data };
        }
      } catch {
        // keep optimistic
      }
      toast.success(`Team lead assigned: ${updated.team_lead_name ?? selectedUser.name}`);
      onSaved({ id: team.id, ...updated });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    setUnassigning(true);
    try {
      const res = await apiFetch(`/teams/${team.id}/team-lead`, {
        method: "DELETE",
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to unassign team lead");
        return;
      }
      toast.success("Team lead unassigned");
      onSaved({ id: team.id, team_lead_id: null, team_lead_name: null });
      onOpenChange(false);
    } finally {
      setUnassigning(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage team lead</DialogTitle>
          <DialogDescription>
            {team.team_lead_name ? (
              <>
                Current team lead for{" "}
                <span className="font-medium text-foreground">{team.name}</span>:{" "}
                <span className="text-foreground font-medium">{team.team_lead_name}</span>.
              </>
            ) : (
              <>
                No team lead assigned to{" "}
                <span className="font-medium text-foreground">{team.name}</span> yet.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && team.team_lead_id ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Assigned team lead
              </div>
              <div className="text-sm font-semibold text-foreground">
                {team.team_lead_name || "Unknown"}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Change team lead
              </button>
              <button
                type="button"
                onClick={handleUnassign}
                disabled={unassigning}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />{" "}
                {unassigning ? "Removing…" : "Unassign"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-muted-foreground">
              Search team lead
            </label>
            <div className="relative">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedUser(null);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                placeholder="Search team leads by name or email…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {selectedUser && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Selected:{" "}
                  <span className="text-foreground font-medium">{selectedUser.name}</span>{" "}
                  <span>({selectedUser.email})</span>
                </div>
              )}
              {showResults && searchQuery.trim() && !selectedUser && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                  {searching ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No team leads found.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {searchResults.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser({ id: u.id, name: u.name, email: u.email });
                              setSearchQuery(u.name);
                              setShowResults(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors"
                          >
                            <div className="text-sm font-medium text-foreground truncate">
                              {u.name || "Unnamed"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {mode === "edit" && team.team_lead_id && (
            <button
              onClick={() => setMode("view")}
              className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors mr-auto"
            >
              Back
            </button>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            Close
          </button>
          {mode === "edit" && (
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedUser}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving…" : team.team_lead_id ? "Save" : "Assign"}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
