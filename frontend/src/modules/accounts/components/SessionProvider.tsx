"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { getSupabase } from "@/lib/supabase";
import { accountsApi } from "../api";
import type { MeProfile } from "../types";

interface SessionContextValue {
  user: User | null;
  me: MeProfile | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function getDisplayName(user: User): string {
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim();
  return user.email?.split("@")[0] || "Pemain";
}

async function loadOrBootstrapProfile(session: Session): Promise<MeProfile> {
  let profile: MeProfile;
  try {
    profile = await accountsApi.getMe();
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 404 ||
      error.code !== "PROFILE_NOT_FOUND"
    ) {
      throw error;
    }
    await accountsApi.bootstrapProfile(getDisplayName(session.user));
    return accountsApi.getMe();
  }

  if (profile.roles.includes("user")) return profile;
  await accountsApi.bootstrapProfile(getDisplayName(session.user));
  return accountsApi.getMe();
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [me, setMe] = useState<MeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeSession = useRef<Session | null>(null);
  const requestId = useRef(0);
  const inFlightProfiles = useRef(new Map<string, Promise<MeProfile>>());
  const mounted = useRef(false);

  const syncSession = useCallback(async (session: Session | null) => {
    activeSession.current = session;
    const currentRequest = ++requestId.current;

    if (!session) {
      setUser(null);
      setMe(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setUser(session.user);
    setError(null);
    setIsLoading(true);

    let profileRequest = inFlightProfiles.current.get(session.user.id);
    if (!profileRequest) {
      profileRequest = loadOrBootstrapProfile(session);
      inFlightProfiles.current.set(session.user.id, profileRequest);
      void profileRequest.then(
        () => inFlightProfiles.current.delete(session.user.id),
        () => inFlightProfiles.current.delete(session.user.id),
      );
    }

    try {
      const profile = await profileRequest;
      if (mounted.current && requestId.current === currentRequest) setMe(profile);
    } catch (profileError) {
      if (mounted.current && requestId.current === currentRequest) {
        setMe(null);
        setError(
          profileError instanceof Error
            ? profileError.message
            : "Tidak dapat memuat profil. Silakan coba lagi.",
        );
      }
    } finally {
      if (mounted.current && requestId.current === currentRequest) setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await syncSession(activeSession.current);
  }, [syncSession]);

  useEffect(() => {
    mounted.current = true;
    const supabase = getSupabase();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (mounted.current) void syncSession(session);
      }, 0);
    });

    void supabase.auth
      .getSession()
      .then(({ data: sessionData, error: sessionError }) => {
        if (!mounted.current) return;
        if (sessionError) {
          setError(sessionError.message);
          setIsLoading(false);
          return;
        }
        void syncSession(sessionData.session);
      })
      .catch((sessionError: unknown) => {
        if (!mounted.current) return;
        setError(
          sessionError instanceof Error
            ? sessionError.message
            : "Tidak dapat memuat sesi. Silakan coba lagi.",
        );
        setIsLoading(false);
      });

    return () => {
      mounted.current = false;
      requestId.current += 1;
      data.subscription.unsubscribe();
    };
  }, [syncSession]);

  return (
    <SessionContext.Provider value={{ user, me, isLoading, error, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useMe(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useMe harus digunakan di dalam SessionProvider");
  return context;
}
