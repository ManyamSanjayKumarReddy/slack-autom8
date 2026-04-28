import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, RefreshCw, ChevronDown, Users } from "lucide-react";
import { apiFetch, isAuthenticated } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { RoleBadge } from "@/components/RoleBadge";
import { useCurrentUser } from "@/lib/user-store";
import { ROLE_LABEL, ROLE_OPTIONS, type Role } from "@/lib/roles";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { SlackStyleFeed, type FeedRow } from "@/components/summaries/SlackStyleFeed";
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
          <UserSummariesSection />
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
                    <button
                      onClick={() => setEditing(u)}
                      disabled={isMe}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isMe ? "Cannot change own role" : "Change Role"}
                    </button>
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
                          <button
                            onClick={() => setEditing(u)}
                            disabled={isMe}
                            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Change Role
                          </button>
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
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
          onSaved={() => fetchUsers()}
        />
      )}
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

type QuickKey = "today" | "yesterday" | "last7" | "last30" | "custom";

function formatRange(r: DateRange | undefined): string {
  if (!r?.from) return "Pick dates";
  if (!r.to || r.from.toDateString() === r.to.toDateString())
    return format(r.from, "MMM d, yyyy");
  return `${format(r.from, "MMM d")} – ${format(r.to, "MMM d, yyyy")}`;
}

function UserSummariesSection() {
  const today = new Date();
  const [range, setRange] = useState<DateRange | undefined>({ from: today, to: today });
  const [activeQuick, setActiveQuick] = useState<QuickKey>("today");
  const [calOpen, setCalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FeedRow[] | null>(null);
  const [notFound, setNotFound] = useState(false);

  // User filter
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [userPickerOpen, setUserPickerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/admin/users?page=1&page_size=200");
        if (res.ok) {
          const data = (await res.json()) as PaginatedResponse<AdminUser>;
          setAllUsers(data.results ?? []);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const fetchSummaries = async (r?: DateRange) => {
    const active = r ?? range;
    setLoading(true);
    setNotFound(false);
    try {
      const params = new URLSearchParams();
      if (active?.from) params.set("from_date", format(active.from, "yyyy-MM-dd"));
      if (active?.to) params.set("to_date", format(active.to, "yyyy-MM-dd"));
      const res = await apiFetch(`/summaries/hierarchy?${params.toString()}`);
      if (!res.ok) { setRows([]); setNotFound(true); return; }
      const data = (await res.json()) as HierarchyResponse;
      const flat: FeedRow[] = [];
      for (const proj of data.projects) {
        for (const [date, d] of Object.entries(proj.dates)) {
          for (const s of d.project_summaries) {
            flat.push({ ...s, date, type: "project", rowKey: `ps-${proj.project_id}-${date}-${s.id}` });
          }
          for (const m of d.members) {
            for (const s of m.personal_summaries) {
              flat.push({
                ...s,
                date,
                type: "personal",
                member_name: m.user_name,
                member_role: m.project_role,
                rowKey: `u-${m.user_id}-${proj.project_id}-${date}-${s.id}`,
              });
            }
          }
        }
      }
      flat.sort((a, b) => {
        if (a.date !== b.date) return a.date > b.date ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setRows(flat);
      if (flat.length === 0) setNotFound(true);
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
    fetchSummaries(r);
  };

  const selectedUser = selectedUserId === "all" ? null : allUsers.find(u => u.id === selectedUserId);
  const filteredRows = (rows ?? []).filter(r => {
    if (selectedUserId === "all") return true;
    if (!selectedUser) return true;
    return r.member_name === selectedUser.name;
  });

  const QUICK: { key: QuickKey; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "last7", label: "Last 7 days" },
    { key: "last30", label: "Last 30 days" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold text-foreground" style={{ fontSize: "15px" }}>
          User Summaries
        </h2>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Quick filters */}
        <div className="flex gap-1 flex-wrap">
          {QUICK.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => key !== "custom" ? applyQuick(key) : undefined}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
                activeQuick === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Calendar picker */}
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-muted transition-colors"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              {formatRange(range)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={range}
              onSelect={(r) => {
                setRange(r);
                setActiveQuick("custom");
                if (r?.from && r?.to && r.from.getTime() !== r.to.getTime()) setCalOpen(false);
              }}
              numberOfMonths={2}
              disabled={{ after: today }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* User filter */}
        <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-muted transition-colors"
            >
              {selectedUser ? selectedUser.name : "All users"}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1" align="start">
            <div className="max-h-60 overflow-y-auto">
              <button
                type="button"
                onClick={() => { setSelectedUserId("all"); setUserPickerOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded text-[13px] transition-colors ${selectedUserId === "all" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}`}
              >
                All users
              </button>
              {allUsers.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setSelectedUserId(u.id); setUserPickerOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded text-[13px] transition-colors ${selectedUserId === u.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}`}
                >
                  <div className="font-medium truncate">{u.name || "Unnamed"}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Fetch button */}
        <button
          type="button"
          onClick={() => fetchSummaries()}
          disabled={loading || !range?.from}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading…" : "Load"}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : rows === null ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center">
          <p className="text-[14px] text-muted-foreground">
            Select a date range and click <span className="font-semibold text-foreground">Load</span> to view summaries.
          </p>
        </div>
      ) : notFound || filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center">
          <p className="text-[14px] font-semibold text-foreground mb-1">No summaries found</p>
          <p className="text-[13px] text-muted-foreground">
            {selectedUserId !== "all" ? `${selectedUser?.name ?? "This user"} has no summaries in this range.` : "No summaries exist for this date range."}
          </p>
        </div>
      ) : (
        <SlackStyleFeed rows={filteredRows} />
      )}
    </div>
  );
}
