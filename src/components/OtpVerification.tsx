import { useState, useEffect } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Shield, Lock, Timer, AlertCircle, Smartphone } from "lucide-react";

export type OtpType = "6digit" | "4digit" | "8digit" | "bank_app";

interface OtpVerificationProps {
  onSubmit: (otp: string) => void;
  error?: string | null;
  otpType?: OtpType;
}

const OtpVerification = ({ onSubmit, error, otpType = "6digit" }: OtpVerificationProps) => {
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const otpLength = otpType === "4digit" ? 4 : otpType === "8digit" ? 8 : 6;

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
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
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5 ring-4 ring-primary/5">
            <Smartphone className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Approve in your banking app</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            We've sent a verification request to your<br />
            banking app. Please open it and approve the transaction.
          </p>
        </div>

        <div className="space-y-6">
          {/* Pulsing animation */}
          <div className="flex justify-center py-6">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            </div>
          </div>

          {error && (
            <div className="flex items-center justify-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-sm">
            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
            {canResend ? (
              <span className="text-muted-foreground">Request expired</span>
            ) : (
              <span className="text-muted-foreground tabular-nums">
                Expires in <span className="font-medium text-foreground">{formatTime(countdown)}</span>
              </span>
            )}
          </div>

          <button
            className="stripe-button flex items-center justify-center gap-2"
            onClick={() => onSubmit("bank_app_approved")}
          >
            <Lock className="h-4 w-4" />
            I've approved in my app
          </button>

          <div className="text-center">
            {canResend ? (
              <button type="button" onClick={handleResend} className="text-sm text-primary hover:underline font-medium transition-colors">
                Resend approval request
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Didn't receive a notification?{" "}
                <span className="text-muted-foreground/70">You can resend in {formatTime(countdown)}</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-2">
            <Lock className="h-3 w-3 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground/50">Secured with 256-bit encryption</p>
          </div>
        </div>
      </div>
    );
  }

  // Standard digit OTP mode
  return (
    <div className="animate-stripe-slide">
      <div className="text-center mb-8">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5 ring-4 ring-primary/5">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Verify your identity</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          We've sent a {otpLength}-digit verification code to your<br />
          registered device for security purposes.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex justify-center" onClick={(e) => {
          // Ensure the OTP input gets focus when clicking the area
          const input = (e.currentTarget as HTMLElement).querySelector('input');
          if (input) input.focus();
        }}>
          <InputOTP maxLength={otpLength} value={otp} onChange={handleChange} autoFocus>
            <InputOTPGroup className="gap-2.5">
              {Array.from({ length: otpLength }, (_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className={`h-13 ${otpLength === 8 ? "w-10" : "w-12"} text-lg font-semibold rounded-lg border-input bg-card shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary ${
                    error ? "border-destructive ring-1 ring-destructive/30" : ""
                  }`}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
            <p className="text-destructive text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 text-sm">
          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          {canResend ? (
            <span className="text-muted-foreground">Code expired</span>
          ) : (
            <span className="text-muted-foreground tabular-nums">
              Code expires in <span className="font-medium text-foreground">{formatTime(countdown)}</span>
            </span>
          )}
        </div>

        <button
          className="stripe-button flex items-center justify-center gap-2"
          disabled={otp.length < otpLength}
          onClick={() => onSubmit(otp)}
        >
          <Lock className="h-4 w-4" />
          Verify & Continue
        </button>

        <div className="text-center">
          {canResend ? (
            <button type="button" onClick={handleResend} className="text-sm text-primary hover:underline font-medium transition-colors">
              Resend verification code
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Didn't receive a code?{" "}
              <span className="text-muted-foreground/70">You can resend in {formatTime(countdown)}</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-2">
          <Lock className="h-3 w-3 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground/50">Secured with 256-bit encryption</p>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
