import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";
import type { PaginatedResponse } from "@/components/PaginationControls";

export type ProjectRole = "employee" | "team_lead";

export interface Project {
  id: string;
  name: string;
  description?: string;
  member_count?: number;
  channel_count?: number;
  manager_id?: string | null;
  manager_name?: string | null;
  /** Current user's project-scoped role (when returned by list/me). */
  my_role?: ProjectRole;
  created_at?: string;
}

export interface ProjectChannel {
  channel_id: string;
  channel_name: string;
  added_at?: string;
}

export interface ProjectMember {
  user_id: string;
  name: string;
  email: string;
  project_role: ProjectRole;
  joined_at?: string;
}

let cached: Project[] | null = null;
let inflight: Promise<Project[]> | null = null;

export async function fetchAllProjects(force = false): Promise<Project[]> {
  if (cached && !force) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await apiFetch(`/projects/?page=1&page_size=200`);
      if (!res.ok) return [];
      const data = (await res.json()) as PaginatedResponse<Project> | { results?: Project[] };
      const list = Array.isArray((data as PaginatedResponse<Project>).results)
        ? (data as PaginatedResponse<Project>).results
        : [];
      cached = list;
      return list;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function invalidateProjectsCache() {
  cached = null;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[] | null>(cached);
  const [loading, setLoading] = useState<boolean>(cached === null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAllProjects()
      .then((p) => {
        if (!cancelled) setProjects(p);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return {
    projects,
    loading,
    refresh: () => fetchAllProjects(true).then((p) => setProjects(p)),
  };
}
