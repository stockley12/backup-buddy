import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck } from "lucide-react";

interface OtpVerificationProps {
  onSubmit: (otp: string) => void;
}

const OtpVerification = ({ onSubmit }: OtpVerificationProps) => {
  const [otp, setOtp] = useState("");

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">Verification Code</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Enter the 6-digit code sent to your device
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        <Button
          className="w-full h-12 text-base"
          disabled={otp.length < 6}
          onClick={() => onSubmit(otp)}
        >
          Verify
        </Button>
      </CardContent>
    </Card>
  );
};

export default OtpVerification;
