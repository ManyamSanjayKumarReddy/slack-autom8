import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";
import type { PaginatedResponse } from "@/components/PaginationControls";

export interface Team {
  id: string;
  name: string;
  description?: string;
  members_count?: number;
  created_at?: string;
  created_by?: string;
}

let cached: Team[] | null = null;
let inflight: Promise<Team[]> | null = null;

export async function fetchAllTeams(force = false): Promise<Team[]> {
  if (cached && !force) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await apiFetch(`/teams/?page=1&page_size=200`);
      if (!res.ok) return [];
      const data = (await res.json()) as
        | PaginatedResponse<Team>
        | { results?: Team[]; teams?: Team[] };
      const list =
        "results" in data && Array.isArray(data.results)
          ? data.results
          : "teams" in data && Array.isArray((data as { teams?: Team[] }).teams)
            ? ((data as { teams?: Team[] }).teams ?? [])
            : [];
      cached = list;
      return list;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function invalidateTeamsCache() {
  cached = null;
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[] | null>(cached);
  const [loading, setLoading] = useState<boolean>(cached === null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAllTeams()
      .then((t) => {
        if (!cancelled) setTeams(t);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { teams, loading, refresh: () => fetchAllTeams(true).then((t) => setTeams(t)) };
}
