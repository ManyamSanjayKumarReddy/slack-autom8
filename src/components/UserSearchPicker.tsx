import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { apiFetch } from "@/lib/auth";

export interface SearchUser {
  username: string;
  name: string;
  email: string;
  role: string;
}

interface Props {
  /** Optional workspace role filter (employee/manager/admin/team_lead). */
  role?: string;
  placeholder?: string;
  onSelect: (user: SearchUser) => void;
  /** IDs to exclude (already selected/added). */
  excludeIds?: string[];
}

export function UserSearchPicker({
  role,
  placeholder = "Search users by name…",
  onSelect,
  excludeIds = [],
}: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("q", q);
        if (role) params.set("role", role);
        const res = await apiFetch(`/admin/users/search?${params.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as { results?: SearchUser[] };
          setResults(data.results ?? []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, role]);

  const filtered = (results ?? [])
    .filter((u) => !excludeIds.includes(u.username))
    .filter((u) => !role || u.role === role);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-background">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching…
          </div>
        ) : !results ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Start typing to search.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No users found.</div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((u) => (
              <li key={u.username}>
                <button
                  onClick={() => onSelect(u)}
                  className="w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors"
                >
                  <div className="text-sm font-medium text-foreground truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {u.email} · {u.role}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
