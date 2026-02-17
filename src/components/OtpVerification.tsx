import { useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Shield, Lock } from "lucide-react";

interface OtpVerificationProps {
  onSubmit: (otp: string) => void;
}

const OtpVerification = ({ onSubmit }: OtpVerificationProps) => {
  const [otp, setOtp] = useState("");

  return (
    <div className="animate-stripe-slide">
      <div className="text-center mb-8">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Authentication required</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter the 6-digit code sent to your device
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup className="gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="h-12 w-11 text-base font-semibold rounded-md border-input bg-card shadow-sm"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <button
          className="stripe-button flex items-center justify-center gap-2"
          disabled={otp.length < 6}
          onClick={() => onSubmit(otp)}
        >
          Verify & Complete
        </button>

        <p className="text-xs text-center text-muted-foreground">
          Didn't receive a code?{" "}
          <button type="button" className="text-primary hover:underline font-medium">
            Resend
          </button>
        </p>

        <div className="flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground/60">
            Secured with 256-bit encryption
          </p>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
