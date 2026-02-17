import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck } from "lucide-react";

interface OtpVerificationProps {
  onSubmit: (otp: string) => void;
}

const OtpVerification = ({ onSubmit }: OtpVerificationProps) => {
  const [otp, setOtp] = useState("");

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="glass-card rounded-2xl overflow-hidden px-8 py-10">
        <div className="flex flex-col items-center gap-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Verification Code</h2>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to your device
            </p>
          </div>

          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup className="gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="h-14 w-12 text-lg font-semibold rounded-xl border-border bg-secondary/30"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>

          <Button
            className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/25"
            disabled={otp.length < 6}
            onClick={() => onSubmit(otp)}
          >
            Verify & Complete
          </Button>

          <p className="text-xs text-muted-foreground">
            Didn't receive a code? Check your device.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
