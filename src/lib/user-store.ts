import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";
import type { Role } from "@/lib/roles";

export interface UserInfo {
  username: string;
  name: string;
  email: string;
  role: Role;
  slack_user_id?: string;
  created_at?: string;
}

let cachedUser: UserInfo | null = null;
let inflight: Promise<UserInfo | null> | null = null;
const listeners = new Set<(u: UserInfo | null) => void>();

function emit() {
  for (const l of listeners) l(cachedUser);
}

export function getCachedUser(): UserInfo | null {
  return cachedUser;
}

export function setCachedUser(u: UserInfo | null) {
  cachedUser = u;
  emit();
}

export async function fetchCurrentUser(force = false): Promise<UserInfo | null> {
  if (cachedUser && !force) return cachedUser;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await apiFetch("/users/me");
      if (!res.ok) return null;
      const u = (await res.json()) as UserInfo;
      cachedUser = u;
      emit();
      return u;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function clearCachedUser() {
  cachedUser = null;
  emit();
}

export function useCurrentUser() {
  const [user, setUser] = useState<UserInfo | null>(cachedUser);
  const [loading, setLoading] = useState<boolean>(cachedUser === null);

  useEffect(() => {
    const onChange = (u: UserInfo | null) => setUser(u);
    listeners.add(onChange);
    let cancelled = false;
    if (!cachedUser) {
      setLoading(true);
      fetchCurrentUser().finally(() => {
        if (!cancelled) setLoading(false);
      });
    } else {
      setLoading(false);
    }
    return () => {
      cancelled = true;
      listeners.delete(onChange);
    };
  }, []);

  return { user, loading, refresh: () => fetchCurrentUser(true) };
}
