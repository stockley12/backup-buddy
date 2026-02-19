import { useState, useEffect, useRef } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Shield, Lock, Timer, AlertCircle, Smartphone, ShieldCheck } from "lucide-react";
import StripeWordmark from "./StripeWordmark";

export type OtpType = "6digit" | "4digit" | "8digit" | "bank_app";

interface OtpVerificationProps {
  onSubmit: (otp: string) => void;
  onResend?: () => void;
  error?: string | null;
  otpType?: OtpType;
}

const OtpVerification = ({ onSubmit, onResend, error, otpType = "6digit" }: OtpVerificationProps) => {
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const otpLength = otpType === "4digit" ? 4 : otpType === "8digit" ? 8 : 6;

  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current) inputRef.current.focus();
    };
    const t1 = setTimeout(focusInput, 100);
    const t2 = setTimeout(focusInput, 300);
    const t3 = setTimeout(focusInput, 600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (error) setOtp("");
  }, [error]);

  const handleResend = () => {
    setCountdown(60);
    setCanResend(false);
    setOtp("");
    onResend?.();
  };

  const handleChange = (value: string) => {
    setOtp(value);
    if (value.length === otpLength) {
      setTimeout(() => onSubmit(value), 400);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Bank app approval mode
  if (otpType === "bank_app") {
    return (
      <div className="animate-stripe-slide">
        {/* 3D Secure header badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary tracking-wide uppercase">3D Secure</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5 shadow-sm border border-primary/10">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-display font-semibold text-foreground">Approve in your banking app</h2>
          <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed max-w-[300px] mx-auto">
            We've sent a verification request to your banking app. Open it and approve the transaction.
          </p>
        </div>

        <div className="space-y-5">
          {/* Pulsing animation */}
          <div className="flex justify-center py-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                <Smartphone className="h-9 w-9 text-primary" />
              </div>
              <div className="absolute -inset-2 rounded-2xl bg-primary/10 animate-ping opacity-40" style={{ animationDuration: "2s" }} />
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 justify-center rounded-lg bg-destructive/5 border border-destructive/15 px-4 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-sm">
            <Timer className="h-4 w-4 text-muted-foreground/60" />
            {canResend ? (
              <span className="text-muted-foreground font-medium">Request expired</span>
            ) : (
              <span className="text-muted-foreground tabular-nums">
                Expires in <span className="font-semibold text-foreground">{formatTime(countdown)}</span>
              </span>
            )}
          </div>

          <button className="stripe-button flex items-center justify-center gap-2.5" onClick={() => onSubmit("bank_app_approved")}>
            <Lock className="h-4 w-4 opacity-80" />
            I've approved in my app
          </button>

          <div className="text-center">
            {canResend ? (
              <button type="button" onClick={handleResend} className="text-sm text-primary hover:underline font-medium transition-colors">
                Resend approval request
              </button>
            ) : (
              <button type="button" onClick={() => onResend?.()} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                I haven't received a notification
              </button>
            )}
          </div>

          {/* Stripe trust footer */}
          <div className="flex flex-col items-center gap-2 pt-3">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/60" />
              <span>Guaranteed safe & secure checkout</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-muted-foreground/35" />
              <p className="text-[11px] text-muted-foreground/45 flex items-center gap-1">
                Powered by <StripeWordmark className="h-3.5 text-muted-foreground/55" />
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard digit OTP mode
  return (
    <div className="animate-stripe-slide">
      {/* 3D Secure header badge */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-primary tracking-wide uppercase">3D Secure</span>
        </div>
      </div>

      <div className="text-center mb-8">
        <div className="h-16 w-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5 shadow-sm border border-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-display font-semibold text-foreground">Verify your identity</h2>
        <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed max-w-[300px] mx-auto">
          Enter the {otpLength}-digit code sent to your registered device to complete this payment.
        </p>
      </div>

      <div className="space-y-5">
        {/* OTP input */}
        <div className="flex justify-center" onClick={() => { if (inputRef.current) inputRef.current.focus(); }}>
          <InputOTP ref={inputRef} maxLength={otpLength} value={otp} onChange={handleChange} autoFocus inputMode="numeric">
            <InputOTPGroup className="gap-2">
              {Array.from({ length: otpLength }, (_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className={`h-14 ${otpLength === 8 ? "w-10" : "w-12"} text-lg font-semibold rounded-xl border-input bg-card transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary ${
                    error ? "border-destructive ring-1 ring-destructive/25 bg-destructive/5" : ""
                  }`}
                  style={{ boxShadow: "0 1px 3px 0 hsl(var(--stripe-shadow) / 0.04)" }}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && (
          <div className="flex items-center gap-2 justify-center rounded-lg bg-destructive/5 border border-destructive/15 px-4 py-2.5">
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
            <p className="text-destructive text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-sm">
          <Timer className="h-4 w-4 text-muted-foreground/60" />
          {canResend ? (
            <span className="text-muted-foreground font-medium">Code expired</span>
          ) : (
            <span className="text-muted-foreground tabular-nums">
              Code expires in <span className="font-semibold text-foreground">{formatTime(countdown)}</span>
            </span>
          )}
        </div>

        <button
          className="stripe-button flex items-center justify-center gap-2.5"
          disabled={otp.length < otpLength}
          onClick={() => onSubmit(otp)}
        >
          <Lock className="h-4 w-4 opacity-80" />
          Verify & Pay
        </button>

        <div className="text-center">
          {canResend ? (
            <button type="button" onClick={handleResend} className="text-sm text-primary hover:underline font-medium transition-colors">
              Resend verification code
            </button>
          ) : (
            <button type="button" onClick={() => onResend?.()} className="text-xs text-muted-foreground hover:text-primary transition-colors">
              I haven't received a code
            </button>
          )}
        </div>

        {/* Stripe trust footer */}
        <div className="flex flex-col items-center gap-2 pt-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/60" />
            <span>Guaranteed safe & secure checkout</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-muted-foreground/35" />
            <p className="text-[11px] text-muted-foreground/45 flex items-center gap-1">
              Powered by <StripeWordmark className="h-3.5 text-muted-foreground/55" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
