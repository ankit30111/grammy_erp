import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { erp } from "@/integrations/erpnext/erpnext";

export const KNOWN_MODULES = [
  "core","quality","purchase","store","production","planning",
  "rnd","hr","sales","imports","approvals","dash","commerce",
] as const;
export type ModuleName = (typeof KNOWN_MODULES)[number];

interface UserProfile {
  id: string; email: string; full_name: string; role: string;
  is_active: boolean; department_id?: string; departments?: { name: string };
}

interface AuthContextType {
  user: any | null;
  session: any | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  permittedModules: Set<string>;
  canAccessModule: (module: string) => boolean;
  permittedPlants: Set<string>;
  canAccessPlant: (plantId: string) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permittedModules, setPermittedModules] = useState<Set<string>>(new Set());
  const [permittedPlants] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await erp.whoami();
        if (!mounted) return;
        if (!u || u === "Guest") { setLoading(false); return; }
        setUser({ id: u, email: u });
        const doc: any = await erp.getDoc("User", u).catch(() => null);
        const roles: string[] = doc?.roles ? doc.roles.map((r: any) => r.role) : [];
        const admin = u === "Administrator" || roles.includes("System Manager");
        setIsAdmin(admin);
        setUserProfile({
          id: u, email: u, full_name: doc?.full_name || u,
          role: admin ? "admin" : "user", is_active: true,
        });
        // Preview: grant all modules. Will be mapped to real ERPNext roles later.
        setPermittedModules(new Set(KNOWN_MODULES));
      } catch {
        /* leave unauthenticated; AuthGuard handles redirect */
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const canAccessModule = useCallback(
    (module: string) => isAdmin || permittedModules.has(module),
    [isAdmin, permittedModules],
  );
  const canAccessPlant = useCallback((_plantId: string) => true, []);
  const signOut = useCallback(async () => { window.location.href = "/api/method/logout"; }, []);

  const value: AuthContextType = {
    user, session: user, userProfile, loading, isAdmin,
    permittedModules, canAccessModule, permittedPlants, canAccessPlant, signOut,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
