import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { erp } from "@/integrations/erpnext/erpnext";

interface AuthGuardProps { children: React.ReactNode; }

// Served behind Frappe's login (www/grammy.py redirects Guests to /login),
// so by the time the SPA runs the user has an ERPNext session. We confirm it
// once and otherwise bounce to the ERPNext login.
export function AuthGuard({ children }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    erp.whoami()
      .then((u) => {
        if (!mounted) return;
        if (!u || u === "Guest") { window.location.href = "/login?redirect-to=/grammy"; return; }
        setAuthed(true); setLoading(false);
      })
      .catch(() => { window.location.href = "/login?redirect-to=/grammy"; });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }
  if (!authed) return null;
  return <>{children}</>;
}
