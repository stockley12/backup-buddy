import { useState, useEffect } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Shield, Lock, Timer, AlertCircle } from "lucide-react";

interface OtpVerificationProps {
  onSubmit: (otp: string) => void;
  error?: string | null;
}

const OtpVerification = ({ onSubmit, error }: OtpVerificationProps) => {
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Clear OTP when an error comes in so user can re-enter
  useEffect(() => {
    if (error) {
      setOtp("");
    }
  }, [error]);

  const handleResend = () => {
    setCountdown(60);
    setCanResend(false);
    setOtp("");
  };

  const handleChange = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      setTimeout(() => onSubmit(value), 400);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="animate-stripe-slide">
      <div className="text-center mb-8">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5 ring-4 ring-primary/5">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Verify your identity</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          We've sent a 6-digit verification code to your<br />
          registered device for security purposes.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={otp} onChange={handleChange} autoFocus>
            <InputOTPGroup className="gap-2.5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className={`h-13 w-12 text-lg font-semibold rounded-lg border-input bg-card shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary ${
                    error ? "border-destructive ring-1 ring-destructive/30" : ""
                  }`}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center justify-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
            <p className="text-destructive text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Countdown timer */}
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
          disabled={otp.length < 6}
          onClick={() => onSubmit(otp)}
        >
          <Lock className="h-4 w-4" />
          Verify & Continue
        </button>

        <div className="text-center">
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="text-sm text-primary hover:underline font-medium transition-colors"
            >
              Resend verification code
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Didn't receive a code?{" "}
              <span className="text-muted-foreground/70">
                You can resend in {formatTime(countdown)}
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-2">
          <Lock className="h-3 w-3 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground/50">
            Secured with 256-bit encryption
          </p>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
