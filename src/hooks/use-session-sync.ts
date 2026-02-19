import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SessionSyncCallbacks {
  onStatusChange: (newStatus: string, formData: Record<string, any>) => void;
}

/**
 * Combines Supabase realtime subscription with a polling fallback
 * to ensure session status changes are never missed.
 */
export function useSessionSync(
  sessionId: string | null,
  callbacks: SessionSyncCallbacks
) {
  const lastKnownStatus = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      lastKnownStatus.current = null;
      return;
    }

    // Reset on new session
    lastKnownStatus.current = "pending";

    const handleUpdate = (status: string, formData: Record<string, any>) => {
      if (status !== lastKnownStatus.current) {
        lastKnownStatus.current = status;
        callbacks.onStatusChange(status, formData);
      }
    };

    // Primary: Realtime subscription
    const channel = supabase
      .channel(`session-sync-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status;
          const formData = (payload.new as any).form_data || {};
          handleUpdate(newStatus, formData);
        }
      )
      .subscribe();

    // Fallback: Poll every 3 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("sessions")
          .select("status, form_data")
          .eq("id", sessionId)
          .single();

        if (data) {
          handleUpdate(
            data.status,
            (data.form_data as Record<string, any>) || {}
          );
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [sessionId]); // callbacks intentionally excluded — use refs in consumer
}
